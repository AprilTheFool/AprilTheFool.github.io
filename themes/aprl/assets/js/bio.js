// Array of quotes
const quotes = [
    "❤ &nbsp; bazinga",
    "❤ &nbsp; bazooka or something idk",
    "❤ &nbsp; i am NOT silly",
    "❤ &nbsp; ok maybe i'm a little silly..",
    "❤ &nbsp; definetely made of clay",
    "❤ &nbsp; i am a robot",
    "❤ &nbsp; shadow wizzard money gang",
    "❤ &nbsp; i can dig that",
    "❤ &nbsp; this post was fact checked by real catgirls",
    "❤ &nbsp; yipeee!!!",
    "❤ &nbsp; type quit smoking in console for easter egg",
    "❤ &nbsp; sudo rm -rf",
    "❤ &nbsp; i use arch btw",
    "❤ &nbsp; chat is this real?"
];

// Function to pick a random quote
function getRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
}

// Replace the text content of the element with id="bio"
document.addEventListener("DOMContentLoaded", function() {
    const bioElement = document.getElementById("bio");
    if (bioElement) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        bioElement.innerHTML = quotes[randomIndex];
    }
});