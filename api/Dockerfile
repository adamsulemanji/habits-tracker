FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.11

COPY requirements.txt ./
RUN pip install -r requirements.txt --target /var/task/

COPY main.py ./

CMD [ "main.handler" ]
