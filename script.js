document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("question");
  const sendButton = document.getElementById("send-button");
  const chatContainer = document.getElementById("chat-container");
  const spinner = document.getElementById("loading-spinner");
  const chatWrapper = document.querySelector(".chat-container");

  function scrollToBottom() {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  }

  function typeText(element, text, speed = 60) {
    let index = 0;
    function showNextChar() {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        scrollToBottom();
        setTimeout(showNextChar, speed);
      }
    }
    showNextChar();
  }

  function appendMessage(sender, message, alignment, originalQuestion = null) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `chat-message ${alignment}`;

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = sender;
    if (sender === "ユーザー") {
      label.style.textAlign = "right";
    }

    const bubble = document.createElement("div");
    bubble.className = `bubble ${alignment === "left" ? "user" : "support"}`;

    messageWrapper.appendChild(label);
    messageWrapper.appendChild(bubble);
    chatContainer.appendChild(messageWrapper);
    scrollToBottom();

    if (alignment === "right") {
      typeText(bubble, message);
      addFeedbackButtons(messageWrapper, originalQuestion, message);
    } else {
      bubble.textContent = message;
    }
  }

  function addFeedbackButtons(container, question, answer) {
    const feedbackDiv = document.createElement("div");
    feedbackDiv.className = "feedback-buttons";
    feedbackDiv.style.marginTop = "0.5em";
    feedbackDiv.style.fontSize = "0.85em";

    feedbackDiv.innerHTML = `
      <div style="margin-bottom: 0.2em; color: #666;">この回答は役に立ちましたか？</div>
      <div style="display: flex; gap: 0.5em; justify-content: flex-end;">
        <button class="feedback-btn" data-feedback="useful" style="background: transparent; border: 1px solid #ccc; border-radius: 6px; padding: 2px 8px; cursor: pointer; color: #666;">👍 はい</button>
        <button class="feedback-btn" data-feedback="not_useful" style="background: transparent; border: 1px solid #ccc; border-radius: 6px; padding: 2px 8px; cursor: pointer; color: #666;">👎 いいえ</button>
      </div>
    `;
    container.appendChild(feedbackDiv);
    scrollToBottom();

    const buttons = feedbackDiv.querySelectorAll(".feedback-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const feedback = btn.dataset.feedback;
        if (feedback === "useful") {
          sendFeedback(question, answer, feedback, "");
          feedbackDiv.innerHTML = "フィードバックありがとうございます。";
        } else {
          showFeedbackReasonForm(feedbackDiv, question, answer);
        }
      });
    });
  }

  function showFeedbackReasonForm(container, question, answer) {
    container.innerHTML = `
      <label for="reason-input" style="font-size: 0.8em; color: #666;">改善点や理由があればご記入ください。</label>
      <textarea id="reason-input" rows="2" placeholder="内容が違う、わかりにくい、など" style="width: 100%; margin-top: 4px; border-radius: 4px; border: 1px solid #ccc; padding: 4px;"></textarea>
      <button id="submit-reason" style="margin-top: 4px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">送信</button>
    `;

    scrollToBottom();

    const submitButton = container.querySelector("#submit-reason");
    submitButton.addEventListener("click", () => {
      const reason = container.querySelector("#reason-input").value.trim();
      if (reason === "") {
        alert("理由を入力してください。");
        return;
      }
      sendFeedback(question, answer, "not_useful", reason);
      container.innerHTML = "フィードバックありがとうございます。";
      scrollToBottom();
    });
  }

  function sendFeedback(question, answer, feedback, reason) {
    const payload = { question, answer, feedback, reason };
    console.log("送信するフィードバック:", payload);

    fetch("https://chatbot-reserve.onrender.com/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        console.log("フィードバック送信成功:", data);
      })
      .catch(err => {
        console.error("フィードバック送信エラー:", err);
      });
  }

  async function ask() {
    const question = input.value.trim();
    if (!question) return;

    appendMessage("ユーザー", question, "left");
    input.value = "";
    spinner.style.display = "block";

    try {
      const res = await fetch("https://chatbot-reserve.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      if (!res.ok) throw new Error("Network error");

      const data = await res.json();
      const answer = data.response?.trim() || "申し訳ありません、うまく回答できませんでした。";
      appendMessage("サポート", answer, "right", question);
    } catch (err) {
      console.error("チャット取得エラー:", err);
      appendMessage("サポート", "現在、接続に問題が発生しています。", "right", question);
    } finally {
      spinner.style.display = "none";
    }
  }

  if (sendButton) {
    sendButton.addEventListener("click", ask);
  }

  window.closeChat = function () {
  const wrapper = document.querySelector(".chat-container");
  if (wrapper) {
    wrapper.style.display = "none";  // 任意：iframe内で非表示にしたい場合
  }

  // ✅ 親ウィンドウに「チャットを閉じて」と伝える
  window.parent.postMessage({ type: "CLOSE_CHAT" }, "https://psi-coffee.com");
};
});
