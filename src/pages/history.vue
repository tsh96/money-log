<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NCard, NDivider, NModal, NScrollbar, NTag, NTimeline, NTimelineItem } from 'naive-ui'
import { db } from '../composables/db'
import type { Transaction } from '../composables/transaction'
import LayoutWithNav from '../components/LayoutWithNav.vue'
import { format } from 'date-fns'

const transactions = ref<Transaction[]>([])

async function loadTransactions() {
  transactions.value = await db.transactions.orderBy('date').reverse().toArray()
}

onMounted(loadTransactions)

const transactionModalShow = ref(false)
const selectedTransaction = ref<Transaction | null>(null)

function showTransactionModal(transaction: Transaction) {
  selectedTransaction.value = transaction
  transactionModalShow.value = true
}

function deleteTransaction() {
  if (selectedTransaction.value) {
    db.transactions.delete(selectedTransaction.value.id)
    transactionModalShow.value = false
    loadTransactions()
  }
}

</script>

<template lang="pug">
LayoutWithNav(title="History" back-url="/")
  NScrollbar
    .container
      NTimeline
        NTimelineItem(
          v-for="transaction in transactions"
          type="error"
          :key="transaction.id"
          :title="`$${transaction.amount.toFixed(2)}`"
          :content="transaction.description"
          :time="format(transaction.date, 'yyyy-MM-dd')"
          @click="showTransactionModal(transaction)"
        )

NModal(
  v-if="selectedTransaction"
  v-model:show="transactionModalShow"
  preset="card"
  style="margin: 20px;"
)
  template(#header)
    div(style="display: flex; align-items: center;")
      div(style="margin-right: 4px;") Transaction Details
      NTag(type="info") {{ selectedTransaction.type }}
  p {{ selectedTransaction.description }}
  .flex.justify-between
    div {{ format(selectedTransaction.date, 'yyyy-MM-dd') }}
    b Amount: ${{ selectedTransaction.amount.toFixed(2) }}
  NDivider
  template(v-if="selectedTransaction.type == 'expense' && selectedTransaction.receipt")
    h3 Receipt
    p Seller: {{ selectedTransaction.receipt.seller }}
    p Amount: 
      b ${{ selectedTransaction.receipt.amount.toFixed(2) }}
    NCard(
      v-for="item in selectedTransaction.receipt.items"
      style="margin-bottom:4px"
    )
      div {{ item.description }}
      div(style="display: flex; justify-content: space-between;")
        div Qty: {{ item.quantity }}
        b ${{ item.amount.toFixed(2) }}
  template(#footer)
    NButton(type="error" @click="deleteTransaction()") Delete
</template>

<style scoped>
.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.container {
  padding: 20px;
}
</style>