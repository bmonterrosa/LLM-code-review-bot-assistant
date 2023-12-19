from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from langchain import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import HuggingFacePipeline

import transformers
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from torch import cuda

from huggingface_hub import login

from uuid import uuid4
from pydantic import BaseModel

import time

device = f'cuda:{cuda.current_device()}' if cuda.is_available() else 'cpu'
model_id = "meta-llama/Llama-2-7b-chat-hf"
#model_id = "EleutherAI/gpt-neo-2.7B"
# tokenizer = AutoTokenizer.from_pretrained(model_id)
# model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto", device_map="auto")
tokenizer = ""
model = ""

save_dir = "/models"

# Instruction how the LLM must respond the comments,
prompt_template = """
{requete}
Response:
"""

#Create the prompt template to use in the Chain for the first Model.
assistant_prompt_template = PromptTemplate(
    input_variables=["requete"],
    template=prompt_template
)

assistant_chain = ""

def create_dialog(customer_request):
    assistant_response = assistant_chain.run(
        {"requete": customer_request}
    )
    return assistant_response


hf_key = "Mettez votre jeton HuggingFaces ici"
login(hf_key)

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


@app.get("/premierdem")
def premier_demarrage():
    global model
    global tokenizer
    global assistant_chain

    model_config = transformers.AutoConfig.from_pretrained(
        model_id,
        token=hf_key
    )

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        trust_remote_code=True,
        config=model_config,
        device_map='auto',
        token=hf_key
    )
    tokenizer = AutoTokenizer.from_pretrained(model_id, use_aut_token=hf_key)

    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=128,
        temperature=0.3,
        #repetition_penalty=1.1,
        return_full_text=True,
        device_map='auto',
        eos_token_id = int(tokenizer.convert_tokens_to_ids('.')),
    )

    assistant_llm = HuggingFacePipeline(pipeline=pipe)

    assistant_chain = LLMChain(
        llm=assistant_llm,
        prompt=assistant_prompt_template,
        output_key="assistant_response",
        verbose=False
    )

    #tokenizer.save_pretrained(save_dir)
    #model.save_pretrained(save_dir)
    print(device)
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

    return {"id": session}



@app.post("/generate")
def generate(request: PromtRequest):
    start_time = time.time()
    assistant_response=create_dialog(request.promt.strip())
    
    print(assistant_response)
    print('--- %s secondes ---' % (time.time() - start_time))
    return {"result": assistant_response}


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
    assistant_response=create_dialog(user)

    print(assistant_response)
    print('--- %s secondes ---' % (time.time() - start_time))
    return {"result": assistant_response}
