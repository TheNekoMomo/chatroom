// get the socket.io client instance
const socket = io({ transports: ['websocket', 'polling'] });

// log socket connection status for debugging
socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('connect_error', (err) => console.error('Socket connect error:', err));
socket.on('error', (err) => console.error('Socket error:', err));

// Get Needed parts of the HTML page
const messagesList = document.getElementById('messages');
const sendButton = document.getElementById('sendButton');

// add an event listener
sendButton.addEventListener('click', sendMessage);
window.addEventListener('scroll', LoadOlderMessages);
window.addEventListener('DOMContentLoaded', loadInitialMessages)

let oldestMessageTimestamp = null;

// process the chat message input and emit it to the server when the send button is clicked
function sendMessage(event) {
  event.preventDefault();
  // get the message input element and its value
  const input = document.getElementById('messageInput');
  // check that the input value is not empty
  if (input.value) {
    // emit the chat message to the server with the current user's username and the input value
    socket.emit('chatmessage', {
      username: window.currentUser,
      message: input.value
    });
    // clear the input value after sending the message
    input.value = '';
  }
  // focus the input element for the next message
  input.focus();
};

async function LoadOlderMessages() {
  if (window.scrollY !== 0) return;
  if (!oldestMessageTimestamp) return;

  const res = await fetch(`/messages?before=${encodeURIComponent(oldestMessageTimestamp)}`);
  const olderMessages = await res.json();

  if (olderMessages.length === 0) return;

  DisplayPastMessages(olderMessages);
  oldestMessageTimestamp = olderMessages[0].createdAt;
}

async function loadInitialMessages() {
  const res = await fetch('/messages');
  const messages = await res.json();

  DisplayPastMessages(messages);
  if (messages.length > 0) {
    oldestMessageTimestamp = messages[0].createdAt;
  }
}

function DisplayPastMessages(messages){
  messages.reverse().forEach(message => {
    const item = document.createElement('li');
    item.textContent = `${message.username}: ${message.message}`;
    messagesList.insertBefore(item, messagesList.firstChild);
  });
}

// listen for chat messages from the server and display them in the chat window
socket.on('chatmessage', (data) => {
  // create a new list item for the incoming message
  const newMessage = document.createElement('li');
  // set the text content of the new list item to include the username and message
  newMessage.textContent = `${data.username}: ${data.message}`;
  // append the new message to the messages list and scroll to the bottom of the chat window
  messagesList.appendChild(newMessage);
  window.scrollTo(0, document.body.scrollHeight);
});