<script setup lang="ts">
import { ref, toRaw } from 'vue'
import { NForm, NFormItem, NInputNumber, NInput, NDatePicker, NDynamicInput, NButton, NCard, NCheckbox, NScrollbar } from 'naive-ui'
import { db } from '../composables/db'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ExpenseTransaction } from '../composables/transaction'
import { useSettings } from '../composables/settings'
import LayoutWithNav from '../components/LayoutWithNav.vue'

const settings = useSettings()

const expensesForm = ref<ExpenseTransaction>({
  type: 'expense',
  amount: 0,
  description: '',
  date: new Date().getTime(),
})

function newReceiptItem() {
  return {
    description: '',
    quantity: 1,
    amount: 0,
  }
}

function newReceipt() {
  return {
    seller: '',
    amount: 0,
    items: []
  }
}

async function saveExpense() {
  await db.transactions.add(toRaw(expensesForm.value))
  expensesForm.value = {
    type: 'expense',
    amount: 0,
    description: '',
    date: new Date().getTime(),
  }
}

const parsingPhoto = ref(false)

// Define the takePhoto function
async function takeAndParsePhoto() {
  try {
    parsingPhoto.value = true
    const photo = await takePhoto()
    const { result } = await parsePhoto(photo)
    expensesForm.value = {
      type: 'expense',
      amount: result.amount,
      description: result.description,
      date: new Date(result.date).getTime(),
      receipt: {
        seller: result.receipt.seller,
        amount: result.receipt.amount,
        items: result.receipt.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          amount: item.amount,
        }))
      }
    }
  } catch(e) {
    console.error(e)
  } finally {
    parsingPhoto.value = false
  }
}

function takePhoto() {
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'environment';
    input.capture = 'environment';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        resolve(file)
      } else {
        reject()
      }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  })
}

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string)?.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

async function parsePhoto(photo: File) {
  const genAI = new GoogleGenerativeAI(settings.value.geminiApiKey);
  // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts

  const model = genAI.getGenerativeModel({ model: settings.value.geminiModel });

  const schemaPrompt = '{description: string, amount: number, date: string, receipt: {seller: string, amount: number, items: {description: string, quantity: number, amount: number}[]}}'

  const promptPrefix = "Express in json format without markdown schema. Use the following schema: \n"
  const prompt = promptPrefix + schemaPrompt

  const filePart = await fileToGenerativePart(photo)
  const generatedContent = await model.generateContent([prompt, filePart as any]);
  const response = await generatedContent.response;
  const text = response.text().replace(/^[^{]*|[^}]*$/g, '');

  const usageMetadata = response.usageMetadata
  const cost = (usageMetadata?.candidatesTokenCount || 0) * 1.05 * 1e-6
    + (usageMetadata?.promptTokenCount || 0) * 0.35 * 1e-6

  const result = JSON.parse(text)

  return { cost, result }
}

</script>

<template lang="pug">
LayoutWithNav(title="Record Expense" back-url="/")
  NScrollbar
    .container
      NForm
        NFormItem(label="Description")
          NInput(v-model:value="expensesForm.description")
        NFormItem(label="Amount")
          NInputNumber(type="number" step="0.01" v-model:value="expensesForm.amount" :precision="2")
            template(#prefix) $
        NFormItem(label="Date")
          NDatePicker(type="date" v-model:value="expensesForm.date")
        NFormItem(label="Receipt?")
          NCheckbox(:checked="!!expensesForm.receipt" @update:checked="expensesForm.receipt = $event ? newReceipt() : undefined")
        template(v-if="!!expensesForm.receipt")
          NFormItem(label="Seller")
            NInput(v-model:value="expensesForm.receipt.seller")
          NFormItem(label="Amount")
            NInputNumber(type="number" step="0.01" v-model:value="expensesForm.receipt.amount" :precision="2")
              template(#prefix) $
          NFormItem(label="Items")
            NDynamicInput(v-model:value="expensesForm.receipt.items" @create="newReceiptItem()" :loading="parsingPhoto")
              template(#default="{ value }")
                NCard
                  NFormItem(label="Description")
                    NInput(v-model:value="value.description")
                  NFormItem(label="Quantity")
                    NInputNumber(type="number" v-model:value="value.quantity" :precision="2")
                  NFormItem(label="Amount")
                    NInputNumber(type="number" step="0.01" v-model:value="value.amount" :precision="2")
                      template(#prefix) $
              template(#action="{ index, create, remove }")
                div(style="display: flex; flex-direction: column; place-items: center; justify-content: center;")
                  NButton(type="primary" size="small" @click="create(index + 1)" block) +
                  NButton(type="error" size="small" @click="remove(index)" block) -
        div(style="display: grid; gap: 10px; grid-template-columns: 1fr 1fr;")
          NButton(type="primary" size="large" @click="saveExpense") Save
          NButton(type="primary" size="large" @click="takeAndParsePhoto()" :loading="parsingPhoto") Take Photo
</template>

<style scoped>
.container {
  padding: 20px;
}
</style>