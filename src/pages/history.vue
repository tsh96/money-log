<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NScrollbar, NTimeline, NTimelineItem } from 'naive-ui'
import { db } from '../composables/db'
import type { Transaction } from '../composables/transaction'
import LayoutWithNav from '../components/LayoutWithNav.vue'
import { format } from 'date-fns'

const transactions = ref<Transaction[]>([])
onMounted(async () => {
  transactions.value = await db.transactions.toArray()
})

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
          :title="`$ ${transaction.amount.toFixed(2)}`"
          :content="transaction.description"
          :time="format(transaction.date, 'yyyy-MM-dd')"
        )
</template>

<style scoped>
.container {
  padding: 20px;
}
</style>