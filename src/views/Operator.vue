<template>
    <div id="operator" class="container">
        <template v-if="session.id">
            <b-row>
                <b-col class="text-center">
                    <h1>В очереди</h1>
                    <h1>{{ session.tickets.pending.length }}</h1>
                </b-col>
                <b-col class="text-center" v-if="current_ticket">
                    <h1>Текущий билет</h1>
                    <h1 v-if="!loading">{{ current_ticket.full_number }}</h1>
                    <h1 v-else><b-spinner></b-spinner></h1>
                </b-col>
            </b-row>
            <b-row class="text-center mt-4" v-if="session.tickets.pending.length > 0 || current_ticket">
                <template v-if="current_ticket">
                    <b-col>
                        <b-btn size="lg" variant="success" :disabled="loading" @click="take">
                            Следующий талон
                        </b-btn>
                        <br><br>
                        <!-- <b-btn variant="outline-primary" :disabled="loading" @click="skip">
                            Пропустить талон, позвать следующего
                        </b-btn> -->
                        <!-- <br><br> -->
                        <b-btn variant="outline-secondary" :disabled="loading">
                            Перерыв
                        </b-btn>
                    </b-col>
                </template>
                <template v-else>
                    <b-col>
                        <b-btn size="lg" variant="success" @click="take">Принять</b-btn>
                    </b-col>
                </template>
            </b-row>
            <b-row class="mt-4 text-center">
                <hr class="mb-4">
                <template v-if="session.status == 'active'">
                    <b-col>
                        <b-button-group>
                            <b-btn size="sm" variant="outline-warning" @click="sessionPause">Приостановить выдачу</b-btn>
                            <b-btn size="sm" variant="outline-danger" @click="sessionFinish">Завершить выдачу</b-btn>
                        </b-button-group>
                    </b-col>
                </template>
                <template v-if="session.status == 'paused'">
                    <b-col>
                        <b-btn size="sm" variant="outline-info" @click="sessionResume">Возобновить выдачу</b-btn>
                    </b-col>
                </template>
                <template v-if="session.status == 'finished'">
                    <b-col>
                        <b-button-toolbar>
                            <b-button-group class="mx-2">
                                <b-btn size="sm" variant="outline-info" @click="sessionResume">Возобновить выдачу</b-btn>
                            </b-button-group>
                            <b-button-group>
                                <b-btn size="sm" variant="outline-danger" @click="sessionSkipPendingTickets">Пропустить все талоны</b-btn>
                                <b-btn size="sm" variant="outline-primary" @click="sessionNew">Новая сессия</b-btn>
                            </b-button-group>
                        </b-button-toolbar>
                    </b-col>
                </template>
            </b-row>
            <b-row class="mt-4 text-center" v-if="message">
                <hr class="mb-4">
                <b-col>
                    {{ message }}
                </b-col>
            </b-row>
        </template>
        <template v-else>
            <b-row>
                <b-col class="text-center mt-4">
                    <b-btn size="lg" variant="success" @click="sessionNew">Новая сессия</b-btn>
                </b-col>
            </b-row>
        </template>
    </div>
</template>

<script>
import axios from 'axios'
import filter from 'lodash/filter'
import each from 'lodash/each'

const LOG_REFRESH_PERIOD = 5000
const SESSION_REFRESH_PERIOD = 30000
const TICKET_SHOW_TIME = 5000

const OPERATOR_ID = 1
const PIN = '12345'

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
            token: null,
            timers: {
                log: null,
                ticket: null,
                session: null,
            },
            loading: false
            // current_ticket: null
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
        },
        current_ticket() {
            let tickets = filter(this.session.tickets.active, i => i.operator_id == OPERATOR_ID)
            if (tickets.length) return tickets[0]
            else return null
        }
    },
    mounted() {
        this.login()
        this.fetchZoneInfo()
    },
    beforeDestroy() {
        clearInterval(this.timers.log)
        clearInterval(this.timers.ticket)
        clearInterval(this.timers.session)
    },
    methods: {
        login() {
            return axios.post('/login/', { 'operator_id': OPERATOR_ID, 'pin': PIN })
                .then(response => this.token = response.data.token)
                .catch(error => {
                    alert('Ошибка входа в систему')
                })
        },
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
                        this.fetchSession()
                    }
                    // if (item.action == 'TICKET-TAKE') {
                    //     this.fetchSession()
                    // }
                    if (item.action == 'TICKET-CLOSE' || item.action == 'TICKET-SKIP') {
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
        take() {
            this.loading = true
            return axios.post('operator/take/', { "token": this.token })
                .then(response => {
                    this.fetchSession()
                    setTimeout(() => this.loading = false, 1000)
                })
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                    setTimeout(() => this.loading = false, 1000)
                })
        },
        skip() {
            this.loading = true
            return axios.post('operator/take/', { "token": this.token, "skip": true })
                .then(response => {
                    this.fetchSession()
                    setTimeout(() => this.loading = false, 1000)
                })
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                    setTimeout(() => this.loading = false, 1000)
                })
        },
        sessionNew() {
            return axios.post('session/new/', { "token": this.token, "zone_id": this.zone_id })
                .then(response => {
                    this.zone.active_session_id = response.data.session.id
                    this.fetchSession()
                })
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                })
        },
        sessionPause() {
            return axios.post(`session/${this.session.id}/pause/`, { "token": this.token })
                .then(this.fetchSession)
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                })
        },
        sessionFinish() {
            return axios.post(`session/${this.session.id}/finish/`, { "token": this.token })
                .then(this.fetchSession)
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                })
        },
        sessionResume() {
            return axios.post(`session/${this.session.id}/resume/`, { "token": this.token })
                .then(this.fetchSession)
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                })
        },
        sessionSkipPendingTickets() {
            return axios.post(`session/${this.session.id}/skip_pending_tickets/`, { "token": this.token })
                .then(this.fetchSession)
                .catch(error => {
                    console.log(error.response)
                    this.fetchSession()
                })
        },
        // addTicket(ticket) {
        //     this.fetchSession()
        // },
        // alarmTicket(ticket) {
        //     // this.fetchSession()
        //     this.current_ticket = ticket
        //     clearTimeout(this.timers.ticket)
        //     this.timers.ticket = setTimeout(() => this.current_ticket = null, TICKET_SHOW_TIME)
        // }
    }
}
</script>