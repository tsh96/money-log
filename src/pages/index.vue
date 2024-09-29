<script setup lang="ts">
import { useLocalStorage, whenever } from '@vueuse/core';
import { NButton, NForm, NFormItem, NInput, NDatePicker, NInputNumber, NDynamicInput, NCard, NCheckbox, NScrollbar, NDivider, NTimeline, NTimelineItem } from 'naive-ui'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ref, toRaw } from 'vue';
import Dexie, { type EntityTable } from 'dexie';
import { format } from 'date-fns';

const db = new Dexie('money-log') as Dexie & {
  transactions: EntityTable<
    Transaction,
    'id' // primary key "id" (for the typings only)
  >;
};

db.version(1).stores({
  transactions: '++id, type, amount, description, date, receipt'
});

const state = ref<'init' | 'income' | 'expenses' | 'history' | 'setting'>('init')

const settings = useLocalStorage('settings', {
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
})

type IncomeTransaction = {
  id?: number;
  type: 'income';
  amount: number;
  description: string;
  date: number;
}

type ExpenseTransaction = {
  id?: number;
  type: 'expense';
  amount: number;
  description: string;
  date: number;
  receipt?: {
    seller: string;
    amount: number;
    items: {
      description: string;
      quantity: number;
      amount: number;
    }[];
  }
}

type Transaction = IncomeTransaction | ExpenseTransaction

const transactions = ref<Transaction[]>([])
whenever(() => state.value === 'history', async () => {
  transactions.value = await db.transactions.toArray()
})

const incomeForm = ref<IncomeTransaction>({
  type: 'income',
  amount: 0,
  description: '',
  date: new Date().getTime(),
})

async function saveIncome() {
  await db.transactions.add(toRaw(incomeForm.value))
  incomeForm.value = {
    type: 'income',
    amount: 0,
    description: '',
    date: new Date().getTime(),
  }
  state.value = 'init'
}

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

async function saveExpenses() {
  await db.transactions.add(toRaw(expensesForm.value))
  expensesForm.value = {
    type: 'expense',
    amount: 0,
    description: '',
    date: new Date().getTime(),
  }
  state.value = 'init'
}

const parsingPhoto = ref(false)

// Define the takePhoto function
async function takeAndParsePhoto(type: 'income' | 'expenses') {
  try {
    parsingPhoto.value = true
    const photo = await takePhoto()
    const { cost, result } = await parsePhoto(photo)
    console.log(cost, result)
    if (type === 'income') {
      incomeForm.value = {
        type: 'income',
        amount: result.amount,
        description: result.description,
        date: new Date(result.date).getTime(),
      }
    } else {
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
    }
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
.header
  NButton.back-button(v-if="state !== 'init'" text size="large" @click="state = 'init'") 
    b  ← Back

NScrollbar
  .container(v-if="state === 'init'")
    .label Record?
    NButton(type="success" size="large" block @click="state = 'income'") Income
    NButton(type="error" size="large" block @click="state = 'expenses'") Expenses

    NDivider
    NButton(type="info" size="large" block @click="state = 'history'") History

    NDivider
    NButton(type="warning" size="large" block @click="state = 'setting'") Settings

  .container(v-else-if="state === 'income'")
    .label Record your income
    NButton(type="primary" size="large" block @click="takeAndParsePhoto('income')") Take Photo
    NForm
      NFormItem(label="Description")
        NInput(v-model:value="incomeForm.description")
      NFormItem(label="Amount")
        NInputNumber(type="number" step="0.01" v-model:value="incomeForm.amount" :precision="2")
          template(#prefix) $
      NFormItem(label="Date")
        NDatePicker(type="date" v-model:value="incomeForm.date")
      NButton(type="primary" size="large" block @click="saveIncome") Save

  .container(v-else-if="state === 'expenses'")
    .label Record your expenses
    NButton(type="primary" size="large" block @click="takeAndParsePhoto('expenses')" :loading="parsingPhoto") Take Photo
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
      NButton(type="primary" size="large" block @click="saveExpenses") Save

  .container(v-else-if="state === 'history'")
    .label History
    NTimeline
      NTimelineItem(
        v-for="transaction in transactions"
        type="error"
        :key="transaction.id"
        :title="`$ ${transaction.amount.toFixed(2)}`"
        :content="transaction.description"
        :time="format(transaction.date, 'yyyy-MM-dd')"
      )

  .container(v-else-if="state === 'setting'")
    .label Settings
    NForm
      NFormItem(label="Gemini Model")
        NInput(v-model:value="settings.geminiModel")
      NFormItem(label="Gemini API Key")
        NInput(v-model:value="settings.geminiApiKey")
      NButton(type="primary" size="large" block @click="state = 'init'") Save

</template>

<style scoped>
.header {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  font-size: 20px;
  font-weight: bold;
  width: 100%;
}

.back-button {
  position: absolute;
  left: 20px;
}

.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 20px;
  flex-grow: 1;
  min-height: calc(100vh - 100px);
}

.container>* {
  margin-bottom: 20px;
}

.label {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  margin-left: auto;
  margin-right: auto;
}
</style>