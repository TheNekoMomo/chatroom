const socket = io();

document.getElementById('sendButton').addEventListener('click', sendMessage);

function sendMessage(event) {
  event.preventDefault();
  const input = document.getElementById('messageInput');
  if (input.value) {
    socket.emit('chatmessage', input.value);
    input.value = '';
  }
  input.focus();
};

socket.on('chatmessage', (data) => {
  console.log(`Message received: ${data}`);
  const messagesList = document.getElementById('messages');
  const newMessage = document.createElement('li');
  newMessage.textContent = data;
  messagesList.appendChild(newMessage);
  window.scrollTo(0, document.body.scrollHeight);
});