// get the socket.io client instance
const socket = io();
// add an event listener to the send button to send a chat message when clicked
document.getElementById('sendButton').addEventListener('click', sendMessage);

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

// listen for chat messages from the server and display them in the chat window
socket.on('chatmessage', (data) => {
  // get the messages list element and create a new list item for the incoming message
  const messagesList = document.getElementById('messages');
  const newMessage = document.createElement('li');
  // set the text content of the new list item to include the username and message
  newMessage.textContent = `${data.username}: ${data.message}`;
  // append the new message to the messages list and scroll to the bottom of the chat window
  messagesList.appendChild(newMessage);
  window.scrollTo(0, document.body.scrollHeight);
});