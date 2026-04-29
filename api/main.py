import os
import uuid
from datetime import datetime, date
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

class HabitInfo(BaseModel):
    habitID: Optional[str] = None
    name: str
    description: str = ""
    category: str = "other"
    frequency: str = "daily"
    targetCount: int = 1
    color: str = "#3b82f6"
    icon: str = "⭐"
    createdAt: Optional[str] = None
    isActive: bool = True


class HabitLogInfo(BaseModel):
    logID: Optional[str] = None
    habitID: str
    date: str
    completedAt: Optional[str] = None
    note: str = ""


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"success": True, "message": "Habits Tracker API running"}


# ─── Habits CRUD ───────────────────────────────────────────────────────────────

@app.get("/habits", response_model=Dict[str, Any])
def list_habits():
    response = habits_table.scan()
    return {"success": True, "items": response.get("Items", [])}


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
            "frequency = :frequency, targetCount = :targetCount, color = :color, "
            "icon = :icon, isActive = :isActive"
        ),
        ExpressionAttributeNames={"#n": "name"},
        ExpressionAttributeValues={
            ":name": habit.name,
            ":description": habit.description,
            ":category": habit.category,
            ":frequency": habit.frequency,
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
    # Also delete all logs for this habit
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
    today = date.today().isoformat()
    log_dates = sorted({log["date"] for log in logs})

    # Streak calculation
    current_streak = 0
    max_streak = 0
    temp = 0
    prev_date = None
    for d in reversed(log_dates):
        if prev_date is None:
            if d == today or d == date.fromordinal(date.today().toordinal() - 1).isoformat():
                current_streak = 1
                temp = 1
            else:
                break
        else:
            prev = date.fromisoformat(prev_date)
            curr = date.fromisoformat(d)
            if (prev - curr).days == 1:
                temp += 1
                if current_streak > 0:
                    current_streak = temp
            else:
                break
        prev_date = d

    for i in range(len(log_dates)):
        if i == 0:
            temp = 1
        else:
            prev = date.fromisoformat(log_dates[i - 1])
            curr = date.fromisoformat(log_dates[i])
            if (curr - prev).days == 1:
                temp += 1
            else:
                temp = 1
        max_streak = max(max_streak, temp)

    # Completion rate over last 30 days
    thirty_days_ago = date.fromordinal(date.today().toordinal() - 30).isoformat()
    recent_logs = [l for l in logs if l["date"] >= thirty_days_ago]
    completion_rate_30d = round(len(set(l["date"] for l in recent_logs)) / 30 * 100, 1)

    # Weekly counts (last 8 weeks)
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
