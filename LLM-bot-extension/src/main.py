from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from transformers import AutoTokenizer, AutoModelForCausalLM, GPTNeoForCausalLM, GPT2Tokenizer
from torch import cuda

from uuid import uuid4
from pydantic import BaseModel

import time
import logging
import os.path

device = f'cuda:{cuda.current_device()}' if cuda.is_available() else 'cpu'

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# tokenizer = AutoTokenizer.from_pretrained(model_id)
# model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto", device_map="auto")
#test
tokenizer = ""
model = ""

save_dir = "/models/"

historique = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    #allow_origins=["https://github.com"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class PromtRequest(BaseModel):
    id: str
    promt: str

def get_model_and_tokenizer(model_id, auto_model, auto_tokenizer):
    global model
    global tokenizer
    if(os.path.exists(save_dir + model_id)):
        logger.info("Loading model and tokenizer from local files")
        model = auto_model.from_pretrained(save_dir + model_id, torch_dtype="auto", device_map='auto')
        tokenizer = auto_tokenizer.from_pretrained(save_dir + model_id)
        logger.info("Loading from local files complete.")
    else:
        logger.info("Model and tokenizer not found locally. Downloading...")
        model = auto_model.from_pretrained(model_id, torch_dtype="auto", device_map='auto')
        tokenizer = auto_tokenizer.from_pretrained(model_id)
        logger.info("Download complete. Saving models to volume " + save_dir + model_id)
        model.save_pretrained(save_dir + model_id)
        tokenizer.save_pretrained(save_dir + model_id)
        logger.info("Successfully saved model and tokenizer to volume.")

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/premierdem")
def premier_demarrage():
    model_id = "stabilityai/stablelm-3b-4e1t"
    get_model_and_tokenizer(model_id, AutoModelForCausalLM, AutoTokenizer)
    print(device)
    return {"Page": "Premier demarrage"}

@app.get("/connexion")
def create_session():
    session = uuid4()
    global historique

    #historique[session] = list[tuple[str, str]]

    return {"id": session}


@app.get("/deconnexion")
def deconnexion():
    print('deconnexion')


@app.post("/generate")
def generate(request: PromtRequest):
    start_time = time.time()
    prompt = f"<s>[INST] {request.promt.strip()} [/INST]"
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(device)

    output = model.generate(
        **inputs,
        max_new_tokens=500,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    print(tokenizer.decode(output))
    print('--- %s secondes ---' % (time.time() - start_time))
    return {"result": tokenizer.decode(output)}


@app.get("/gen")
def test_generate():
    start_time = time.time()
    user = """
    Here is an example of python code:

    "
    def op_sum(x,y):
    	return 'Hello'
    "

    Here is a comment made for this code:

    "The function does not return an addition."

    Is this a relevant and respectful review comment for this code?
    """
    prompt = f"<s>[INST] {user.strip()} [/INST]"
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(device)

    output = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    print(tokenizer.decode(output))
    print('--- %s secondes ---' % (time.time() - start_time))
    return {"result": tokenizer.decode(output)}

@app.get("/testsavebasic")
def test_save():
    test_file = open(save_dir + 'testfile.txt', 'w')
    test_file.write('Hello world')
    logger.info(str(os.path.abspath(test_file.name)))
    test_file.close()

@app.get("/testreadbasic")
def test_save():
    test_file = open(save_dir + 'testfile.txt', 'r')
    logger.info("The file reads : " + test_file.read())
    logger.info(os.path.abspath(test_file.name))
    test_file.close()

@app.get("/testsaveadvanced")
def test_save():
    model_id = "NlpHUST/gpt-neo-vi-small"
    if(os.path.exists(save_dir + model_id)):
        logger.info("Loading model and tokenizer from local files")
        model = GPTNeoForCausalLM.from_pretrained(save_dir + model_id)
        tokenizer = GPT2Tokenizer.from_pretrained(save_dir + model_id)
        logger.info("Loading from local files complete.")
    else:
        logger.info("Model and tokenizer not found locally. Downloading...")
        model = GPTNeoForCausalLM.from_pretrained(model_id)
        tokenizer = GPT2Tokenizer.from_pretrained(model_id)
        logger.info("Download complete. Saving models to volume " + save_dir + model_id)
        model.save_pretrained(save_dir + model_id)
        tokenizer.save_pretrained(save_dir + model_id)
        logger.info("Successfully saved model and tokenizer to volume.")
    
@app.get("/testsavefinal")
def test_save():
    get_model_and_tokenizer("NlpHUST/gpt-neo-vi-small", GPTNeoForCausalLM, GPT2Tokenizer)

    start_time = time.time()

    prompt = """
    xin chào
    """
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids
    gen_tokens = model.generate(input_ids, do_sample=True, temperature=1.0, max_length=1024)
    output = tokenizer.batch_decode(gen_tokens)[0]
    logger.info(output)

    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": output}
