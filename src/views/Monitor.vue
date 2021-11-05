<template>
  <div id="monitor" class="container-fluid mt-1">
    <audio src="../assets/bell.mp3" ref="audio"></audio>
    <vertical-layout
      v-if="isVertical"
      :message="message"
      :session="session"
      :available-services="available_services_str"
    />
    <horizontal-layout
      v-else
      :message="message"
      :session="session"
      :available-services="available_services_str"
    />
  </div>
</template>

<script>
import axios from "axios"
import each from "lodash/each"
import filter from "lodash/filter"
import map from "lodash/map"

import HorizontalLayout from "./MonitorLayouts/Horizontal"
import VerticalLayout from "./MonitorLayouts/Vertical"

const LOG_REFRESH_PERIOD = 3000
const SESSION_REFRESH_PERIOD = 30000
const TICKET_SHOW_TIME = 600000

export default {
  components: {
    HorizontalLayout,
    VerticalLayout,
  },
  props: ["zone_id"],
  data() {
    return {
      zone: {
        active_session_id: null,
        log_offset: 0,
        services: [],
        operators: [],
      },
      session: {
        id: null,
        planned_finish_datetime: null,
        status: "",
        tickets: {
          pending: [],
          closed: [],
          active: [],
        },
        limits: {},
      },
      timers: {
        log: null,
        ticket: null,
        session: null,
      },
      sound_url: "../assets/bell.mp3",
      new_tickets: [],
      current_ticket: null,
    }
  },
  computed: {
    message() {
      switch (this.session.status) {
        case "paused":
          return "Выдача талонов приостановлена"
        case "timeout":
        case "finished":
          return "Выдача талонов завершена"
      }
      return false
    },
    available_services() {
      return filter(this.zone.services, (service) => {
        if (
          this.session.limits[service.id] &&
          this.session.limits[service.id].service_is_disabled == true
        )
          return false
        else return true
      })
    },
    available_services_str() {
      return map(this.available_services, (i) => i.name).join(", ")
    },
    isVertical() {
      return this.$route.query.vertical
    },
  },
  mounted() {
    this.fetchZoneInfo()
    this.timers.ticket = setInterval(this.handleNewTickets, TICKET_SHOW_TIME)
  },
  beforeDestroy() {
    clearInterval(this.timers.log)
    clearInterval(this.timers.ticket)
    clearInterval(this.timers.session)
  },
  methods: {
    fetchZoneInfo() {
      return axios
        .get(`/zone/${this.zone_id}/info/`)
        .then((response) => {
          this.zone = response.data
          this.fetchSession()
          this.timers.session = setInterval(
            this.fetchSession,
            SESSION_REFRESH_PERIOD
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
        each(log, (item) => {
          if (item.id < this.zone.log_offset) {
            console.log("oops")
          }
          if (item.action == "TICKET-ISSUE") {
            this.addTicket(item.ticket)
          }
          if (item.action == "TICKET-TAKE") {
            this.alarmTicket(item.ticket)
            this.fetchSession()
          }
          if (item.action == "TICKET-CLOSE" || item.action == "TICKET-SKIP") {
            this.handleNewTickets()
            this.fetchSession()
          }
          if (item.action == "SESSION-NEW") {
            this.zone.active_session_id = item.session.id
            this.fetchSession()
          }
          if (item.action == "SESSION-PAUSE") {
            this.session.status = "paused"
          }
          if (item.action == "SESSION-RESUME") {
            this.session.status = "active"
          }
          if (item.action == "SESSION-FINISH") {
            this.session.status = "finished"
          }
          this.zone.log_offset = item.id
        })
      }
    },
    addTicket(ticket) {
      this.fetchSession()
    },
    alarmTicket(ticket) {
      this.new_tickets.push(ticket)
      clearInterval(this.timers.ticket)
      this.timers.ticket = setInterval(this.handleNewTickets, TICKET_SHOW_TIME)
      this.handleNewTickets()
    },
    handleNewTickets() {
      if (this.new_tickets.length > 0) {
        this.current_ticket = this.new_tickets.pop()
        this.$refs.audio.play()
      } else {
        this.current_ticket = null
      }
    },
  },
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active до версии 2.1.8 */ {
  opacity: 0;
}

.blink_me {
  animation: blinker 5s linear infinite;
  animation-direction: alternate;
}

@keyframes blinker {
  45% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
}
</style>
