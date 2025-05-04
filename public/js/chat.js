import { createSocket } from './socket.js'

const $ = (x) => document.querySelector(x)
const esc = (x) => {
  const txt = document.createTextNode(x)
  const p = document.createElement('p')
  p.appendChild(txt)
  return p.innerHTML
}

const ws = await createSocket()
const debounceTime = 1000
let base = Math.floor(Math.random() * 50 + 30)
const noise = Math.floor(Math.random() * 10 - 5)

if (!sessionStorage.getItem('peopleOnline')) {
  sessionStorage.setItem('peopleOnline', base)
} else {
  base = +sessionStorage.getItem('peopleOnline')
}

let timeout

const $peopleOnline = $('#peopleOnline p span')
const $skipBtn = $('#skip-btn')
const $sendBtn = $('#send-btn')
const $msgs = $('#messages')
const $msgArea = $('#message-area')
const $typing = $('#typing')
const $input = $('#message-input')

function configureChat() {
  $input.focus()

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      $skipBtn.click()
      e.preventDefault()
    }
  })
  $input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      clearInterval(timeout)
      ws.emit('typing', false)
      $sendBtn.click()
      return e.preventDefault()
    }
    ws.emit('typing', true)
  })
  $input.addEventListener('keyup', function (e) {
    clearInterval(timeout)
    timeout = setTimeout(() => {
      ws.emit('typing', false)
    }, debounceTime)
  })
}

const initializeConnection = () => {
  $msgs.innerHTML = `
    <div class="message-status">Looking for people online...</div>
  `
  $sendBtn.disabled = true
  $input.value = ''
  $input.readOnly = true

  ws.emit('peopleOnline')
  const params = new URLSearchParams(window.location.search)
  const interests =
    params
      .get('interests')
      ?.split(',') || []
  ws.emit('match', { data: 'text', interests })
}

$skipBtn.addEventListener('click', async () => {
  ws.emit('disconnect')  // Disconnect the current user (you)
  initializeConnection()  // Reset the UI and wait for a new match

  // Wait for the stranger to click skip and disconnect them when they do
  ws.emit('strangerSkip')  // You can send this event to inform the stranger to stay until they skip
})

$sendBtn.addEventListener('click', () => {
  const msg = $input.value.trim()
  if (!msg) return

  const msgE = document.createElement('div')
  msgE.className = 'message'
  msgE.innerHTML = `<span class="you">You:</span> ${esc(msg)}`

  $msgs.appendChild(msgE)
  $msgArea.scrollTop = $msgArea.scrollHeight
  $input.value = ''

  ws.emit('message', esc(msg))
})

ws.register('peopleOnline', async (data) => {
  $peopleOnline.innerHTML = base + noise + +data
})

ws.register('connected', async (data) => {
  $msgs.innerHTML = ''
  const status = document.createElement('div')
  status.className = 'message-status'
  status.innerHTML = 'You are now talking to a random stranger'
  $msgs.appendChild(status)

  $msgArea.scrollTop = $msgArea.scrollHeight
  $sendBtn.disabled = false
  $input.readOnly = false
})

ws.register('message', async (msg) => {
  if (!msg) return

  const msgE = document.createElement('div')
  msgE.className = 'message'
  msgE.innerHTML = `<span class="strange">Stranger:</span> ${esc(msg)}`

  $msgs.appendChild(msgE)
  $msgArea.scrollTop = $msgArea.scrollHeight
})

ws.register('typing', async (isTyping) => {
  $typing.style.display = isTyping ? 'block' : 'none'
  $msgArea.scrollTop = $msgArea.scrollHeight
})

ws.register('disconnect', async () => {
  $msgs.innerHTML = '<div class="message-status">Stranger disconnected. Please click skip to find a new person.</div>'
})

ws.register('strangerSkip', async () => {
  // Handle the stranger skipping, show them the disconnect message
  $msgs.innerHTML = '<div class="message-status">Stranger has skipped. You are now matched with a new person.</div>'
  initializeConnection()  // Reset and wait for a new match
})

configureChat()
initializeConnection()
