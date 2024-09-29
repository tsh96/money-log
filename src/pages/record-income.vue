<script setup lang="ts">
import { ref, toRaw } from 'vue'
import { NForm, NFormItem, NInputNumber, NInput, NDatePicker, NButton, NScrollbar } from 'naive-ui'
import { db } from '../composables/db'
import type { IncomeTransaction } from '../composables/transaction'
import LayoutWithNav from '../components/LayoutWithNav.vue'

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
}

</script>

<template lang="pug">
LayoutWithNav(title="Record Income" back-url="/")
  NScrollbar
    .container
      NForm
        NFormItem(label="Description")
          NInput(v-model:value="incomeForm.description")
        NFormItem(label="Amount")
          NInputNumber(type="number" step="0.01" v-model:value="incomeForm.amount" :precision="2")
            template(#prefix) $
        NFormItem(label="Date")
          NDatePicker(type="date" v-model:value="incomeForm.date")
        NButton(type="primary" size="large" block @click="saveIncome") Save
</template>

<style scoped>
.container {
  padding: 20px;
}
</style>