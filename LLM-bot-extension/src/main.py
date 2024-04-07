from fastapi import HTTPException
from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from transformers import AutoTokenizer, AutoModelForCausalLM, AutoConfig, GPTNeoForCausalLM, GPT2Tokenizer
from torch import cuda
from accelerate import disk_offload
from huggingface_hub import snapshot_download

from uuid import uuid4
from pydantic import BaseModel

import time
import logging
import os.path
import torch
import subprocess

hugging_face_token = os.getenv('HUGGING_FACE_TOKEN')

device = f'cuda:{cuda.current_device()}' if cuda.is_available() else 'cpu'

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

tokenizer = ""
model = ""
model_loaded=""

save_dir = "/models/"

model_id = "google/gemma-2b-it"
auto_model=AutoModelForCausalLM
auto_tokenizer=AutoTokenizer
auto_config=AutoConfig

historique = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class PromtRequest(BaseModel):
    id: str
    promt: str


class PromptMessage(BaseModel):
    prompt: str
    num_tokens: int


def get_model_and_tokenizer(model_id, auto_model, auto_tokenizer):
    global model
    global model_loaded
    global tokenizer
    if model_loaded != model_id :
        model_loaded = model_id

        if (os.path.exists(save_dir + model_id) == False):
            logger.info("Model and tokenizer not found locally. Downloading and saving model and tokenizer " + 
                        "to local files...")
            allowed_patterns = ["*.json", "*.safetensors", "*.model"]
            snapshot_download(repo_id=model_id, local_dir=save_dir+model_id, local_dir_use_symlinks=False, 
                              etag_timeout=60, resume_download=True, token=hugging_face_token, 
                              allow_patterns=allowed_patterns)
            logger.info("The model and tokenizer have been successfully downloaded and saved to folder " + 
                        save_dir + model_id + " .")

        logger.info("Loading model and tokenizer from local files...")
        model = auto_model.from_pretrained(save_dir + model_id, torch_dtype=torch.bfloat16, device_map='auto',
                                        token=hugging_face_token)
        logger.info("Model loaded.")
        tokenizer = auto_tokenizer.from_pretrained(save_dir + model_id, token=hugging_face_token)
        logger.info("Tokenizer loaded.")
        logger.info("Loading from local files complete.")
            
    else :
        logger.info("The " + model_id + " model is already loaded.")


# This line loads a default LLM on server startup
# get_model_and_tokenizer(model_id, auto_model, auto_tokenizer)


@app.get("/")
def test_read_root():
    return {"Hello": "World"}

@app.get("/setHuggingFaceToken/")
async def setToken(data: str):
    logger.info("Setting token...")
    global hugging_face_token
    hugging_face_token = data
    print(device)

@app.get("/changeLLM/")
async def changeLLM(data: str):
    logger.info("Changing LLM please wait...")
    get_model_and_tokenizer(data, AutoModelForCausalLM, AutoTokenizer)
    print(device)

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

    # historique[session] = list[tuple[str, str]]

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
        # eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
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
    prompt = user.strip()
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True).to(device)

    output = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    print(tokenizer.decode(output))
    print('--- %s secondes ---' % (time.time() - start_time))
    return {"result": tokenizer.decode(output)}

@app.get("/testsave")
def test_save():

    start_time = time.time()

    get_model_and_tokenizer(model_id, auto_model, auto_tokenizer)

    logger.info('--- %s secondes ---' % (time.time() - start_time))

    start_time = time.time()
    user = "Write me a poem about Machine Learning."
    prompt = user.strip()
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True).to(device)

    output = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    logger.info(tokenizer.decode(output))
    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": tokenizer.decode(output)}


# To faciliate testing, here's an endpoint to test the LLM included.
# JSON Format should be 
# {
#   "prompt": "scenario template",
#   "num_tokens": 200 or the value you want
# }
# Here's a few scenarios exemple: https://docs.google.com/document/d/1OKnzy3pTW6oRd3671XEzIRW34GuDjbHlaVjotqIt6yA/edit
# If you are having trouble formatting the json, paste the scenario into the template and ask ChatGPT ;)
@app.post("/generate-prompt")
def message_generate(request: PromptMessage):
    # Ensure the tokenizer and model are already loaded
    if tokenizer == "" or model == "":
        raise HTTPException(status_code=503, detail="Model is not loaded")

    start_time = time.time()
    prompt = request.prompt.strip()

    # Prepare the prompt for the model
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True).to(device)

    # Generate the response using the specified number of tokens
    output = model.generate(
        **inputs,
        max_new_tokens=request.num_tokens,  # Use the specified number of tokens
        # eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    generated_text = tokenizer.decode(output)

    print(f"--- {(time.time() - start_time)} seconds ---")
    return {"result": generated_text}

@app.get("/testsavebig")
def test_save():

    model_id = "google/gemma-7b-it"

    start_time = time.time()

    get_model_and_tokenizer(model_id, auto_model, auto_tokenizer)

    logger.info('--- %s secondes ---' % (time.time() - start_time))

    start_time = time.time()
    user = "Write me a poem about Machine Learning."
    prompt = user.strip()
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True).to(device)

    output = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    logger.info(tokenizer.decode(output))
    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": tokenizer.decode(output)}