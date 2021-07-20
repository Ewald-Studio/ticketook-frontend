<template>
    <div id="monitor" class="container-fluid mt-1">
        <audio src="../assets/bell.mp3" ref="audio"></audio>
        <template v-if="session.id">
            <b-row v-if="message" class="mb-2 mx-1 text-warning">
                <b-col cols="12">
                    <h3>{{ message }}</h3>
                </b-col>
            </b-row>
            <b-row class="mx-1">
                <!-- <b-col cols="2">
                    <h5>Недавние</h5>
                    <p v-for="ticket in session.tickets.closed.slice(-9)" :key="ticket.id">{{ ticket.full_number }}</p>
                </b-col> -->
                <b-col cols="3">
                    <h4 style="text-decoration: underline">В очереди</h4>
                    <h3 v-for="ticket in session.tickets.pending.slice(0,10)" :key="ticket.id">{{ ticket.full_number }}</h3>
                    <p v-if="session.tickets.pending.length > 10">И ещё {{ session.tickets.pending.length - 10 }}</p>
                </b-col>
                <b-col cols="3" class="text-success">
                    <h4 style="text-decoration: underline">Вызваны</h4>
                    <h3 v-for="ticket in session.tickets.active" :key="ticket.id">{{ ticket.full_number }}</h3>
                </b-col>
                <b-col cols="6" class="text-center">
                    <transition name="fade">
                        <h1 v-if="current_ticket" class="mt-4 mb-4 text-danger" style="font-size: 780%; background-color: #fff; padding: 1em 0">
                            {{ current_ticket.full_number }}
                        </h1>
                    </transition>
                </b-col>
            </b-row>
        </template>
        <template v-else>
            <h1 class="text-center mb-4">Выдача талонов приостановлена</h1>
        </template>
    </div>
</template>

<script>
import axios from 'axios'
import each from 'lodash/each'

const LOG_REFRESH_PERIOD = 3000
const SESSION_REFRESH_PERIOD = 30000
const TICKET_SHOW_TIME = 15000

export default {
    props: [
        'zone_id'
    ],
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
                status: '',
                tickets: {
                    pending: [],
                    closed: [],
                    active: [],
                }
            },
            timers: {
                log: null,
                ticket: null,
                session: null,
            },
            sound_url: '../assets/bell.mp3',
            new_tickets: [],
            current_ticket: null
        }
    },
    computed: {
        message() {
            switch(this.session.status) {
                case 'paused':
                    return 'Выдача талонов приостановлена'
                case 'timeout':
                case 'finished':
                    return 'Выдача талонов завершена'
            }
            return false
        }
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
            return axios.get(`/zone/${this.zone_id}/info/`)
                .then(response => {
                    this.zone = response.data
                    this.fetchSession()
                    this.timers.session = setInterval(this.fetchSession, SESSION_REFRESH_PERIOD)
                })
                .then(() => {
                    this.fetchLog()
                    this.timers.log = setInterval(this.fetchLog, LOG_REFRESH_PERIOD)
                })
                .catch(error => {
                    console.log(error.response)
                })
        },
        fetchSession() {
            if (this.zone.active_session_id) {
                return axios.get(`/session/${this.zone.active_session_id}/info/`)
                    .then(response => this.session = response.data)
            }
        },
        fetchLog() {
            return axios.get(`/zone/${this.zone_id}/log/?offset=${this.zone.log_offset}`)
                .then(response => this.processLog(response.data))
        },
        processLog(log) {
            if (log.length > 0) {
                each(log, item => {
                    if (item.id < this.zone.log_offset) {
                        console.log('oops')
                    }
                    if (item.action == 'TICKET-ISSUE') {
                        this.addTicket(item.ticket)
                    }
                    if (item.action == 'TICKET-TAKE') {
                        this.alarmTicket(item.ticket)
                        this.fetchSession()
                    }
                    if (item.action == 'TICKET-CLOSE' || item.action == 'TICKET-SKIP') {
                        this.fetchSession()
                    }
                    if (item.action == 'SESSION-NEW') {
                        this.zone.active_session_id = item.session.id
                        this.fetchSession()
                    }
                    if (item.action == 'SESSION-PAUSE') {
                        this.session.status = 'paused'
                    }
                    if (item.action == 'SESSION-RESUME') {
                        this.session.status = 'active'
                    }
                    if (item.action == 'SESSION-FINISH') {
                        this.session.status = 'finished'
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
            }
            else {
                this.current_ticket = null
            }
        }
    }
}
</script>

<style>
    .fade-enter-active, .fade-leave-active {
        transition: opacity .5s;
    }
    .fade-enter, .fade-leave-to /* .fade-leave-active до версии 2.1.8 */ {
        opacity: 0;
    }
</style>