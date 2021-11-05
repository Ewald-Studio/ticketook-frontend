<template>
  <div id="terminal" class="container">
    <b-col v-if="session.id">
      <b-row class="text-center mt-4">
        <template v-if="message">
          <p style="padding: 0.5em 0.2em; background: #fff;" class="text-dark">
            {{ message }}
          </p>
        </template>
        <template v-else>
          <div v-if="!issued_ticket">
            <h2 class="mt-4 mb-4">Выберите услугу</h2>
            <div v-for="service in zone.services" :key="service.id">
              <b-btn
                :block="true"
                size="lg"
                class="mt-2 mb-2"
                variant="primary"
                @click="issueTicket(service.slug)"
              >
                {{ service.name }}
              </b-btn>
            </div>
          </div>
          <div v-else>
            <h1>Ваш билет</h1>
            <h1 style="font-size: 400%" class="mb-4">{{ issued_ticket }}</h1>
            <h2>Перед вами в очереди: {{ pending }}</h2>
          </div>
        </template>
      </b-row>
    </b-col>
    <b-col v-else-if="initialLoading == false">
      <b-row class="text-center mt-4">
        <h1>Выдача талонов приостановлена</h1>
      </b-row>
    </b-col>
    <b-col v-else>
      <b-row class="text-center mt-4">
        <h1>Загрузка...</h1>
      </b-row>
    </b-col>
  </div>
</template>

<script>
import axios from "axios"
import each from "lodash/each"

const ACCESS_KEY = "123"
const LOG_REFRESH_PERIOD = 3000
const SESSION_REFRESH_PERIOD = 15000
const ZONE_REFRESH_PERIOD = 15000
const TICKET_SHOW_TIME = 100

export default {
  props: ["zone_id"],
  data() {
    return {
      zone: {
        active_session_id: null,
        log_offset: 0,
        services: [],
      },
      session: {
        id: null,
        status: "",
      },
      timers: {
        log: null,
        session: null,
        ticket: null,
      },
      issued_ticket: null,
      pending: null,
      initialLoading: true,
      msg: "",
    }
  },
  computed: {
    message() {
      if (this.msg != "") {
        return this.msg
      }
      switch (this.session.status) {
        case "paused":
          return "Выдача талонов приостановлена"
        case "timeout":
        case "finished":
          return "Выдача талонов завершена"
      }
      return false
    },
  },
  mounted() {
    this.fetchZoneInfo()
  },
  beforeDestroy() {
    clearInterval(this.timers.log)
    clearInterval(this.timers.ticket)
    clearInterval(this.timers.session)
    clearInterval(this.timers.zone)
  },
  methods: {
    fetchZoneInfo() {
      return axios
        .get(`/zone/${this.zone_id}/info/`)
        .then((response) => {
          this.initialLoading = false
          this.zone = response.data
          this.fetchSession()
          this.timers.session = setInterval(
            this.fetchSession,
            SESSION_REFRESH_PERIOD
          )
          this.timers.zone = setInterval(
            this.checkForNewSession,
            ZONE_REFRESH_PERIOD
          )
        })
        .then(() => {
          this.fetchLog()
          this.timers.log = setInterval(this.fetchLog, LOG_REFRESH_PERIOD)
        })
        .catch((error) => {
          console.log(error.response)
        })
    },
    checkForNewSession() {
      return axios.get(`/zone/${this.zone_id}/info/`).then((response) => {
        if (response.data.active_session_id != this.zone.active_session_id) {
          clearInterval(this.timers.log)
          clearInterval(this.timers.session)
          this.fetchZoneInfo()
        }
      })
    },
    fetchSession() {
      if (this.zone.active_session_id) {
        return axios
          .get(`/session/${this.zone.active_session_id}/info/`)
          .then((response) => (this.session = response.data))
      }
    },
    fetchLog() {
      return axios
        .get(`/zone/${this.zone_id}/log/?offset=${this.zone.log_offset}`)
        .then((response) => this.processLog(response.data))
    },
    processLog(log) {
      if (log.length > 0) {
        this.fetchSession()
        each(log, (item) => {
          // if (item.id < this.zone.log_offset) {
          //     console.log('oops')
          // }
          // if (item.action == 'SESSION-NEW') {
          //     this.zone.active_session_id = item.session.id
          //     this.fetchSession()
          // }
          // if (item.action == 'SESSION-PAUSE') {
          //     this.session.status = 'paused'
          // }
          // if (item.action == 'SESSION-RESUME') {
          //     this.session.status = 'active'
          // }
          // if (item.action == 'SESSION-FINISH') {
          //     this.session.status = 'finished'
          // }
          this.zone.log_offset = item.id
        })
      }
    },
    issueTicket(service_slug) {
      return axios
        .post("ticket/", {
          access_key: ACCESS_KEY,
          service_slug: service_slug,
          session_id: this.session.id,
        })
        .then((response) => {
          this.issued_ticket = response.data.ticket.full_number
          this.pending = response.data.ticket.pending
          setTimeout(() => {
            this.issued_ticket = null
            this.pending = null
          }, TICKET_SHOW_TIME)
        })
        .catch((error) => {
          if (error.response.status == 410) {
            this.msg = "Талоны на выбранную услугу закончились"
            setTimeout(() => (this.msg = ""), 5000)
          }
          console.log(error.response)
        })
    },
  },
}
</script>
