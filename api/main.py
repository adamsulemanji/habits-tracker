import os
import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any

import boto3
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel

app = FastAPI(title="Habits Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://habits.adamsulemanji.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

handler = Mangum(app)

dynamodb = boto3.resource("dynamodb")
habits_table = dynamodb.Table(os.environ.get("HABITS_TABLE_NAME", "HabitsTable"))
logs_table = dynamodb.Table(os.environ.get("LOGS_TABLE_NAME", "HabitLogsTable"))


# ─── Models ────────────────────────────────────────────────────────────────────

class Schedule(BaseModel):
    # 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    daysOfWeek: List[int] = list(range(7))
    # repeat every N weeks (1=every week, 2=every other week, etc.)
    weekInterval: int = 1
    # optional hard stop date (ISO YYYY-MM-DD)
    endDate: Optional[str] = None


class HabitInfo(BaseModel):
    habitID: Optional[str] = None
    name: str
    description: str = ""
    category: str = "other"
    frequency: str = "daily"          # kept for backward compat
    schedule: Optional[Schedule] = None
    targetCount: int = 1
    color: str = "#3b82f6"
    icon: str = ""
    createdAt: Optional[str] = None
    isActive: bool = True


class HabitLogInfo(BaseModel):
    logID: Optional[str] = None
    habitID: str
    date: str
    completedAt: Optional[str] = None
    note: str = ""


# ─── Schedule helpers ──────────────────────────────────────────────────────────

def _get_scheduled_days_in_range(schedule: Optional[Dict], frequency: str,
                                  start: date, end: date) -> int:
    """Count how many days in [start, end] the habit is scheduled."""
    if schedule is None:
        # Legacy: daily = every day, weekly = one day per week
        days = (end - start).days + 1
        return days if frequency == "daily" else max(1, days // 7)

    days_of_week = schedule.get("daysOfWeek", list(range(7)))
    week_interval = max(1, schedule.get("weekInterval", 1))
    habit_end = schedule.get("endDate")

    if not days_of_week:
        return 1  # avoid divide-by-zero

    count = 0
    cur = start
    # Use the ISO week of the start of our range as the reference point
    # so week_interval is consistent relative to when we're measuring.
    ref_week = start.isocalendar()[1]

    while cur <= end:
        if habit_end and cur.isoformat() > habit_end:
            break
        iso_week = cur.isocalendar()[1]
        # distance in weeks from reference
        week_diff = (iso_week - ref_week) % 53  # handles year wrap roughly
        if week_diff % week_interval == 0:
            # cur.weekday(): 0=Mon … 6=Sun — matches our convention
            if cur.weekday() in days_of_week:
                count += 1
        cur += timedelta(days=1)

    return max(count, 1)


def _is_scheduled_on(schedule: Optional[Dict], frequency: str, d: date) -> bool:
    """Return True if the habit is scheduled on the given date."""
    if schedule is None:
        return frequency == "daily"  # weekly habits can be logged any day

    days_of_week = schedule.get("daysOfWeek", list(range(7)))
    week_interval = max(1, schedule.get("weekInterval", 1))
    habit_end = schedule.get("endDate")

    if habit_end and d.isoformat() > habit_end:
        return False
    if d.weekday() not in days_of_week:
        return False
    if week_interval > 1:
        # Check whether this ISO week is a "scheduled" week.
        # We treat ISO week 1 as the reference point.
        iso_week = d.isocalendar()[1]
        if iso_week % week_interval != 0:
            return False
    return True


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"success": True, "message": "Habits Tracker API running"}


# ─── Habits CRUD ───────────────────────────────────────────────────────────────

@app.get("/habits", response_model=Dict[str, Any])
def list_habits():
    response = habits_table.scan()
    return {"success": True, "items": response.get("Items", [])}


@app.get("/habits/scheduled/today", response_model=Dict[str, Any])
def habits_scheduled_today():
    """Return habits that are scheduled for today (useful for daily check-in)."""
    today = date.today()
    response = habits_table.scan()
    habits = response.get("Items", [])
    scheduled = [
        h for h in habits
        if h.get("isActive") and _is_scheduled_on(h.get("schedule"), h.get("frequency", "daily"), today)
    ]
    return {"success": True, "items": scheduled}


@app.get("/habits/{habitID}", response_model=Dict[str, Any])
def get_habit(habitID: str):
    response = habits_table.get_item(Key={"habitID": habitID})
    item = response.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"success": True, "item": item}


@app.post("/habits", response_model=Dict[str, Any])
def create_habit(habit: HabitInfo):
    if not habit.habitID:
        habit.habitID = str(uuid.uuid4())
    if not habit.createdAt:
        habit.createdAt = datetime.utcnow().isoformat()
    data = habit.dict()
    habits_table.put_item(Item=data)
    return {"success": True, "item": data}


@app.put("/habits/{habitID}", response_model=Dict[str, Any])
def update_habit(habitID: str, habit: HabitInfo):
    response = habits_table.get_item(Key={"habitID": habitID})
    if "Item" not in response:
        raise HTTPException(status_code=404, detail="Habit not found")
    habits_table.update_item(
        Key={"habitID": habitID},
        UpdateExpression=(
            "SET #n = :name, description = :description, category = :category, "
            "frequency = :frequency, schedule = :schedule, "
            "targetCount = :targetCount, color = :color, "
            "icon = :icon, isActive = :isActive"
        ),
        ExpressionAttributeNames={"#n": "name"},
        ExpressionAttributeValues={
            ":name": habit.name,
            ":description": habit.description,
            ":category": habit.category,
            ":frequency": habit.frequency,
            ":schedule": habit.schedule.dict() if habit.schedule else None,
            ":targetCount": habit.targetCount,
            ":color": habit.color,
            ":icon": habit.icon,
            ":isActive": habit.isActive,
        },
        ReturnValues="ALL_NEW",
    )
    data = habit.dict()
    data["habitID"] = habitID
    return {"success": True, "item": data}


@app.delete("/habits/{habitID}", response_model=Dict[str, Any])
def delete_habit(habitID: str):
    response = habits_table.get_item(Key={"habitID": habitID})
    if "Item" not in response:
        raise HTTPException(status_code=404, detail="Habit not found")
    habits_table.delete_item(Key={"habitID": habitID})
    logs_response = logs_table.query(
        IndexName="habitID-date-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("habitID").eq(habitID),
    )
    with logs_table.batch_writer() as batch:
        for log in logs_response.get("Items", []):
            batch.delete_item(Key={"logID": log["logID"]})
    return {"success": True, "message": "Habit and its logs deleted"}


# ─── Logs CRUD ─────────────────────────────────────────────────────────────────

@app.get("/logs", response_model=Dict[str, Any])
def list_logs(
    habitID: Optional[str] = Query(default=None),
    startDate: Optional[str] = Query(default=None),
    endDate: Optional[str] = Query(default=None),
):
    if habitID:
        kwargs: Dict[str, Any] = {
            "IndexName": "habitID-date-index",
            "KeyConditionExpression": boto3.dynamodb.conditions.Key("habitID").eq(habitID),
        }
        if startDate and endDate:
            kwargs["KeyConditionExpression"] = (
                boto3.dynamodb.conditions.Key("habitID").eq(habitID)
                & boto3.dynamodb.conditions.Key("date").between(startDate, endDate)
            )
        elif startDate:
            kwargs["KeyConditionExpression"] = (
                boto3.dynamodb.conditions.Key("habitID").eq(habitID)
                & boto3.dynamodb.conditions.Key("date").gte(startDate)
            )
        response = logs_table.query(**kwargs)
    else:
        response = logs_table.scan()
    return {"success": True, "items": response.get("Items", [])}


@app.get("/logs/{logID}", response_model=Dict[str, Any])
def get_log(logID: str):
    response = logs_table.get_item(Key={"logID": logID})
    item = response.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"success": True, "item": item}


@app.post("/logs", response_model=Dict[str, Any])
def create_log(log: HabitLogInfo):
    if not log.logID:
        log.logID = str(uuid.uuid4())
    if not log.completedAt:
        log.completedAt = datetime.utcnow().isoformat()
    data = log.dict()
    logs_table.put_item(Item=data)
    return {"success": True, "item": data}


@app.delete("/logs/{logID}", response_model=Dict[str, Any])
def delete_log(logID: str):
    response = logs_table.get_item(Key={"logID": logID})
    if "Item" not in response:
        raise HTTPException(status_code=404, detail="Log not found")
    logs_table.delete_item(Key={"logID": logID})
    return {"success": True, "message": "Log deleted"}


# ─── Analysis ──────────────────────────────────────────────────────────────────

def _compute_habit_analysis(habit: Dict[str, Any], logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    today = date.today()
    today_str = today.isoformat()
    yesterday_str = (today - timedelta(days=1)).isoformat()
    log_dates = sorted({log["date"] for log in logs})

    schedule = habit.get("schedule")
    frequency = habit.get("frequency", "daily")

    # ── Streak: counts consecutive SCHEDULED days completed ──
    # Build the sequence of scheduled days up to today (most recent first)
    # and walk backward checking completion.
    current_streak = 0
    streak_broken = False
    check = today
    # Look back up to 2 years
    for _ in range(730):
        if check < date(2000, 1, 1):
            break
        if _is_scheduled_on(schedule, frequency, check):
            if check.isoformat() in log_dates:
                current_streak += 1
            else:
                # Allow a single-day grace (today might not be logged yet)
                if check.isoformat() == today_str and current_streak == 0:
                    # skip today if not yet logged — don't break streak
                    check -= timedelta(days=1)
                    continue
                streak_broken = True
                break
        check -= timedelta(days=1)

    # Max streak over all time (consecutive scheduled-day completions)
    max_streak = 0
    run = 0
    log_set = set(log_dates)
    if schedule or frequency == "daily":
        # Walk forward through all scheduled days from first log date
        if log_dates:
            scan_start = date.fromisoformat(log_dates[0])
            scan_end = today
            cur = scan_start
            while cur <= scan_end:
                if _is_scheduled_on(schedule, frequency, cur):
                    if cur.isoformat() in log_set:
                        run += 1
                        max_streak = max(max_streak, run)
                    else:
                        if cur.isoformat() != today_str:  # grace for today
                            run = 0
                cur += timedelta(days=1)
    else:
        max_streak = len(log_dates)  # weekly: any completion counts

    # ── Completion rate: last 30 scheduled days ──
    thirty_ago = today - timedelta(days=30)
    scheduled_count = _get_scheduled_days_in_range(schedule, frequency, thirty_ago, today)
    recent_completed = len({l["date"] for l in logs if l["date"] >= thirty_ago.isoformat()})
    completion_rate_30d = round(min(recent_completed / scheduled_count, 1.0) * 100, 1)

    # ── Weekly activity counts ──
    weekly: Dict[str, int] = {}
    for log in logs:
        d = date.fromisoformat(log["date"])
        week = d.strftime("%Y-W%W")
        weekly[week] = weekly.get(week, 0) + 1

    return {
        "habitID": habit["habitID"],
        "name": habit.get("name", ""),
        "totalLogs": len(logs),
        "uniqueDays": len(log_dates),
        "currentStreak": current_streak,
        "maxStreak": max_streak,
        "completionRate30d": completion_rate_30d,
        "scheduledDays30": scheduled_count,
        "weeklyActivity": weekly,
        "logDates": log_dates,
    }


@app.get("/analysis", response_model=Dict[str, Any])
def get_analysis():
    habits_resp = habits_table.scan()
    habits = habits_resp.get("Items", [])
    logs_resp = logs_table.scan()
    all_logs = logs_resp.get("Items", [])
    results = []
    for habit in habits:
        habit_logs = [l for l in all_logs if l["habitID"] == habit["habitID"]]
        results.append(_compute_habit_analysis(habit, habit_logs))
    return {"success": True, "items": results}


@app.get("/analysis/{habitID}", response_model=Dict[str, Any])
def get_habit_analysis(habitID: str):
    habit_resp = habits_table.get_item(Key={"habitID": habitID})
    habit = habit_resp.get("Item")
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    logs_resp = logs_table.query(
        IndexName="habitID-date-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("habitID").eq(habitID),
    )
    logs = logs_resp.get("Items", [])
    return {"success": True, "item": _compute_habit_analysis(habit, logs)}
