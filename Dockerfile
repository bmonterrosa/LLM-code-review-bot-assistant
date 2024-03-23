#
FROM python:3.11.0

#
WORKDIR /code

#
COPY ./requirements.txt /code/requirements.txt

#
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
RUN pip install pip -q install git+https://github.com/huggingface/transformers.git accelerate

#
COPY ./LLM-bot-extension/src /code/app

#
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]