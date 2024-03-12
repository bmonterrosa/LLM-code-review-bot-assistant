from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from transformers import AutoTokenizer, AutoModelForCausalLM, GPTNeoForCausalLM, GPT2Tokenizer, pipeline
from torch import cuda

from uuid import uuid4
from pydantic import BaseModel
import transformers
import torch
import logging
import time
import os.path

device = f'cuda:{cuda.current_device()}' if cuda.is_available() else 'cpu'
# INSERT HUGGINGFACE ACCESS TOKEN WITH WRITE PERMISSION HERE
access_token = ""

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/checkDevice")
def check_device():
    cuda_available = cuda.is_available()
    current_device = f"cuda:{cuda.current_device()}" if cuda_available else "cpu"
    device_name = torch.cuda.get_device_name(current_device) if cuda_available else "CPU"
    print(device)
    return {"cuda_available": cuda_available, "current_device": current_device, "device_name": device_name}

@app.get("/premierdem")
def premier_demarrage():

    logger.info(device)

    model_id = "codellama/CodeLlama-7b-Instruct-hf"

    global model
    global tokenizer

    model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto", device_map="auto")
    tokenizer = AutoTokenizer.from_pretrained(model_id)

    tokenizer.save_pretrained(save_dir)

    try:
        model.save_pretrained(save_dir)
    except NotImplementedError as e:
        logger.error(f"An error occurred while saving the model: {e}")

    logger.info(device)
    return {"Page": "Premier demarrage"}

# marche pas
@app.get("/demarrage")
def demarrage_volume():
    global model
    global tokenizer

    model = AutoModelForCausalLM.from_pretrained("./models/")
    tokenizer = AutoTokenizer.from_pretrained("./models/")

    return {"Page": "demarrage"}


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
    user_prompt = """
    Here is an example of python code:

    "
    def op_sum(x,y):
    	return 'Hello'
    "

    Here is a comment made for this code:

    "The function does not return an addition."

    Is this a relevant and respectful review comment for this code?
    """
    prompt = f"<s>[INST] {user_prompt.strip()} [/INST]"
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = tokenizer.decode(outputs[0].to(device))

    logger.info(output)
    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": output}

@app.get("/testingLLMs")
def LLM_testing():

    # model_id = "codellama/CodeLlama-7b-Instruct-hf"       # works but pretty slow
    # model_id = "stabilityai/stablelm-3b-4e1t"             # doesn't work but fast
    # model_id = "Writer/palmyra-small"                     # doesn't work but fast
    # model_id = "ai-forever/mGPT-13B"                      # takes forever
    # model_id = "bigcode/starcoderbase-1b"                 # doesn't know how to speak english

    logger.info(transformers.__version__)
    model_id = "google/gemma-2b"
    global model
    global tokenizer

    offload_folder = "./weights_offload_folder"  # Specify the path to the offload folder
    model = AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True, torch_dtype="auto", device_map="auto", offload_folder=offload_folder, token=access_token).to(device)

    tokenizer = AutoTokenizer.from_pretrained(model_id, token=access_token)


    start_time = time.time()
    user_prompt = """
    Here is an example of python code:

    "
    def op_sum(x,y):
    	return 'Hello'
    "

    Here is a comment made for this code:

    "The function does not return an addition."

    Is this a relevant and respectful review comment for this code?
    """
    prompt = f"<s>[INST] {user_prompt.strip()} [/INST]"
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = tokenizer.decode(outputs[0].to(device))

    logger.info(output)
    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": output}

@app.get("/tinyllama")
def LLM_testing():

    start_time = time.time()

    pipe = pipeline("text-generation", model="TinyLlama/TinyLlama-1.1B-Chat-v1.0", torch_dtype=torch.bfloat16, device_map="auto")

    # We use the tokenizer's chat template to format each message - see https://huggingface.co/docs/transformers/main/en/chat_templating
    messages = [
        {
            "role": "system",
            "content": "You are a chatbot who can help code!",
        },
        {"role": "user", "content": """
    Here is an example of python code:

    "
    def op_sum(x,y):
    	return 'Hello'
    "

    Here is a comment made for this code:

    "The function does not return an addition."

    Is this a relevant and respectful review comment for this code?
    """},
    ]
    prompt = pipe.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = pipe(prompt, max_new_tokens=256, do_sample=True, temperature=0.7, top_k=50, top_p=0.95)
    logger.info(outputs[0]["generated_text"])
    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": outputs[0]["generated_text"]}

@app.get("/testing_vietnamese_GPT")
def LLM_testing():

    model = GPTNeoForCausalLM.from_pretrained("NlpHUST/gpt-neo-vi-small")
    tokenizer = GPT2Tokenizer.from_pretrained("NlpHUST/gpt-neo-vi-small")

    tokenizer.save_pretrained(save_dir)
    # try:
    #     model.save_pretrained(save_dir)
    # except NotImplementedError as e:
    #     logger.error(f"An error occurred while saving the model: {e}")

    logger.info(device)

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

@app.get("/say_hello")
def say_hello():
    start_time = time.time()
    user = """
    Say "hello".
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

@app.get("/yes_no")
def yes_no():
    start_time = time.time()
    user = """
    Here is an example of python code:

    "
    def op_sum(x,y):
    	return 'Hello'
    "

    Here is a comment made for this code:

    "The function does not return an addition."

    Is this a relevant and respectful review comment for this code? Answer with only "yes" or "no".
    """
    prompt = f"<s>[INST] {user.strip()} [/INST]"
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(device)

    output = model.generate(
        **inputs,
        max_new_tokens=200,
        eos_token_id=int(tokenizer.convert_tokens_to_ids('.'))
    )
    output = output[0].to(device)

    logger.info(tokenizer.decode(output))

    logger.info('--- %s secondes ---' % (time.time() - start_time))
    return {"result": tokenizer.decode(output)}

@app.get("/testgemma")
def test_gemma():
    logger.info(transformers.__version__)
    tokenizer = AutoTokenizer.from_pretrained("google/gemma-7b", token=access_token)
    model = AutoModelForCausalLM.from_pretrained("google/gemma-7b", token=access_token, device_map="auto")

    input_text = """Here is an example of python code:

    "
    def op_sum(x,y):
    	return 'Hello'
    "

    Here is a comment made for this code:

    "The function does not return an addition."

    Is this a relevant and respectful review comment for this code?"""
    input_ids = tokenizer(input_text, return_tensors="pt").to("cuda")

    outputs = model.generate(**input_ids)
    print(tokenizer.decode(outputs[0]))
