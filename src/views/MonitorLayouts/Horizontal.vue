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

    <b-row v-if="message" class="mb-1 mx-1 text-warning">
      <b-col cols="12">
        <!-- Информационное сообщение -->
        <h4>{{ message }}</h4>
      </b-col>
    </b-row>
    <b-row class="mx-1">
      <b-col cols="5">
        <!-- Сейчас в очереди -->
        <h4 style="text-decoration: underline">В очереди</h4>
        <h3
          v-for="ticket in session.tickets.pending.slice(0, 8)"
          :key="ticket.id"
        >
          {{ ticket.full_number }}
        </h3>
        <p v-if="session.tickets.pending.length > 8">
          И ещё {{ session.tickets.pending.length - 8 }}
        </p>
      </b-col>
      <b-col cols="7" class="text-success">
        <!-- Сейчас на приёме -->
        <h4 style="text-decoration: underline">На приёме</h4>
        <h1
          v-for="ticket in session.tickets.active"
          :key="ticket.id"
          class="mt-2 mb-2 text-danger"
          style="font-size: 800%;"
        >
          {{ ticket.full_number }}
        </h1>
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
