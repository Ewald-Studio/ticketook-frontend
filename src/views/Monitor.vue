<template>
    <div id="monitor" class="container">
        <audio src="../assets/bell.mp3" ref="audio"></audio>
        <template v-if="session.id">
            <b-row v-if="message">
                <b-col cols="12">
                    <h3>{{ message }}</h3>
                </b-col>
            </b-row>
            <b-row>
                <!-- <b-col cols="2">
                    <h5>Недавние</h5>
                    <p v-for="ticket in session.tickets.closed.slice(-9)" :key="ticket.id">{{ ticket.full_number }}</p>
                </b-col> -->
                <b-col cols="4">
                    <h5>В очереди</h5>
                    <p v-for="ticket in session.tickets.pending.slice(0,10)" :key="ticket.id">{{ ticket.full_number }}</p>
                    <p v-if="session.tickets.pending.length > 10">И ещё {{ session.tickets.pending.length - 10 }}</p>
                </b-col>
                <b-col cols="4">
                    <h5>Активные</h5>
                    <p v-for="ticket in session.tickets.active" :key="ticket.id">{{ ticket.full_number }}</p>
                </b-col>
                <b-col cols="4" class="text-center">
                    <h1 v-if="current_ticket" class="mb-2">{{ current_ticket.full_number }}</h1>
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

const LOG_REFRESH_PERIOD = 5000
const SESSION_REFRESH_PERIOD = 30000
const TICKET_SHOW_TIME = 7000

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
            // this.handleNewTickets()
            // this.timers.ticket = setTimeout(() => this.current_ticket = null, TICKET_SHOW_TIME)
        },
        handleNewTickets() {
            if (this.new_tickets.length > 0) {
                this.current_ticket = this.new_tickets.pop()
                this.$refs.audio.play()
            }
            // else {
            //     this.current_ticket = null
            // }
        }
    }
}
</script>