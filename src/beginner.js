//load各种dom用来状态切换
const buttonPlay = document.getElementById("beginner-play");
const selectPage = document.getElementById("create-or-join");
const create = document.getElementById("beginner-create");
const join = document.getElementById("beginner-join");
const howToPlay = document.getElementById("beginner-instructions");
const instructionPage = document.getElementById("instructions");
const closeInstruction = document.getElementById("close-instructions");

buttonPlay.addEventListener("click",()=>{
  selectPage.hidden = false;
  selectPage.disabled = false;
});
howToPlay.addEventListener("click",()=>{
  instructionPage.hidden = false;
  instructionPage.disabled = false;
});
closeInstruction.addEventListener("click",()=>{
  instructionPage.hidden = true;
  instructionPage.disabled = true;
});
create.addEventListener("click",()=>{
  window.location.replace("./start.html")
});
join.addEventListener("click",()=>{
  window.location.replace("./join.html")
})