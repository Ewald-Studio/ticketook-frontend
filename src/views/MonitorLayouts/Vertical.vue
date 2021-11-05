<template>
  <div v-if="session.id">
    <b-row class="mb-1 mx-1" v-if="session.status != 'finished'">
      <!-- Доступные прививки -->
      <h3
        style="background-color: #fff; padding-top: 0.2em; padding-bottom: 0.2em"
        class="text-center text-danger"
      >
        <span class="blink_me">Сегодня: {{ availableServices }}</span>
      </h3>
    </b-row>

    <b-row v-if="message" class="mb-1 mx-1 text-warning text-center">
      <b-col cols="12">
        <!-- Информационное сообщение -->
        <h4>{{ message }}</h4>
      </b-col>
    </b-row>

    <b-row class="mx-1">
      <b-col cols="12">
        <!-- Сейчас в очереди -->
        <h4 style="text-decoration: underline">
          Проходите для заполнения документов
        </h4>
      </b-col>
    </b-row>

    <b-row
      class="mx-1"
      v-if="session.status != 'finished' && session.tickets.pending.length == 0"
    >
      <p>Не выдано ни одного билета</p>
    </b-row>

    <b-row class="mx-1">
      <b-col cols="4">
        <h1
          style="font-size: 80px"
          v-for="ticket in session.tickets.pending.slice(0, 8)"
          :key="ticket.id"
        >
          {{ ticket.full_number }}
        </h1>
      </b-col>
      <b-col cols="4">
        <h1
          style="font-size: 80px"
          v-for="ticket in session.tickets.pending.slice(8, 16)"
          :key="ticket.id"
        >
          {{ ticket.full_number }}
        </h1>
      </b-col>
      <b-col cols="4">
        <h1
          style="font-size: 80px"
          v-for="ticket in session.tickets.pending.slice(16, 20)"
          :key="ticket.id"
        >
          {{ ticket.full_number }}
        </h1>
        <template v-if="session.tickets.pending.length > 20">
          <hr />
          <p>Ещё в очереди:<br />{{ session.tickets.pending.length - 20 }}</p>
        </template>
      </b-col>
    </b-row>

    <b-row
      class="mx-1 mt-2"
      style="border-top: 5px solid #eee; padding-top: 40px"
    >
      <b-col cols="12" class="text-success">
        <div style="height: 490px;">
          <!-- Сейчас на приёме -->
          <h4 style="text-decoration: underline" class="mb-0">На приёме</h4>
          <h1
            v-for="ticket in session.tickets.active"
            :key="ticket.id"
            class="mb-1 text-danger"
            style="font-size: 400%; float: left; margin-right: 60px"
          >
            {{ ticket.full_number }}
          </h1>
        </div>
      </b-col>
    </b-row>
  </div>
  <div v-else>
    <h1 class="text-center mb-4">Выдача талонов приостановлена</h1>
  </div>
</template>

<script>
export default {
  props: ["session", "message", "availableServices"],
}
</script>
