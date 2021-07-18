<template>
    <div id="terminal" class="container">
        <b-col v-if="session.id">
            <b-row class="text-center mt-4">
                <template v-if="message">
                    <p>{{ message }}</p>
                </template>
                <template v-else>
                    <div v-if="!issued_ticket">
                        <h1 class="mt-4">Электронная очередь</h1>
                        <b-btn size="lg" class="mt-4" variant="primary" @click="issueTicket">Получить билет</b-btn>
                    </div>
                    <div v-else>
                        <h1>Ваш билет: {{ issued_ticket }}</h1>
                        <h2>Перед Вами в очереди: {{ pending }}</h2>
                    </div>
                </template>
            </b-row>
        </b-col>
        <b-col v-else>
            <b-row class="text-center mt-4">
                <h1>Выдача талонов приостановлена</h1>
            </b-row>
        </b-col>
    </div>
</template>

<script>
import axios from 'axios'
import each from 'lodash/each'

const ACCESS_KEY = '123'
const LOG_REFRESH_PERIOD = 5000
const SESSION_REFRESH_PERIOD = 15000
const TICKET_SHOW_TIME = 5000

export default {
    props: [
        'zone_id'
    ],
    data() {
        return {
            zone: {
                active_session_id: null,
                log_offset: 0
            },
            session: {
                id: null,
                status: ''
            },
            timers: {
                log: null,
                session: null,
                ticket: null,
            },
            issued_ticket: null,
            pending: null,
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
        issueTicket() {
            return axios.post('ticket/', {
                "access_key": ACCESS_KEY,
                "service_slug": "vaccination",
                "session_id": this.session.id
            })
                .then(response => {
                    this.issued_ticket = response.data.ticket.full_number
                    this.pending = response.data.ticket.pending
                    setTimeout(() => {
                        this.issued_ticket = null
                        this.pending = null
                    }, TICKET_SHOW_TIME);
                })
                .catch(error => {
                    console.log(error.response)
                })
        },
    }
}
</script>