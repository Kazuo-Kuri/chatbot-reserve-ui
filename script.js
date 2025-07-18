document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("question");
  const chatContainer = document.getElementById("chat-container");
  const spinner = document.getElementById("loading-spinner");
  const responseMode = document.getElementById("response-mode"); // 文量切り替え
  const md = window.markdownit(); // markdown-it 初期化

  function scrollToBottom() {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  }

  function typeText(element, html, speed = 20) {
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    let index = 0;
    function showNextChar() {
      if (index < text.length) {
        element.textContent += text.charAt(index++);
        scrollToBottom();
        setTimeout(showNextChar, speed);
      } else {
        element.innerHTML = html; // 最後にHTMLで置き換え（リンクなど反映）
      }
    }
    showNextChar();
  }

  function appendMessage(sender, message, alignment, originalQuestion = null) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `chat-message ${alignment}`;
    messageWrapper.setAttribute("dir", "ltr");

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = sender;

    const bubble = document.createElement("div");
    bubble.className = `bubble ${alignment === "left" ? "user" : "support"}`;
    bubble.setAttribute("dir", "ltr");

    if (alignment === "right") {
      bubble.style.minWidth = "70%";
      bubble.style.minHeight = "1.5em";
    }

    messageWrapper.appendChild(label);
    messageWrapper.appendChild(bubble);
    chatContainer.appendChild(messageWrapper);
    scrollToBottom();

    if (alignment === "right") {
      const html = md.render(message); // markdown to HTML
      typeText(bubble, html);
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
        <button class="feedback-btn" data-feedback="useful">👍 はい</button>
        <button class="feedback-btn" data-feedback="not_useful">👎 いいえ</button>
      </div>
    `;
    container.appendChild(feedbackDiv);
    scrollToBottom();

    feedbackDiv.querySelectorAll(".feedback-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const feedback = btn.dataset.feedback;
        if (feedback === "useful") {
          sendFeedback(question, answer, feedback, "");
          feedbackDiv.innerHTML = "フィードバックありがとうございました！";
        } else {
          showFeedbackReasonForm(feedbackDiv, question, answer);
        }
      });
    });
  }

  function showFeedbackReasonForm(container, question, answer) {
    container.innerHTML = `
      <label for="reason-input" style="font-size: 0.8em; color: #666;">差し支えなければ、理由を教えてください：</label>
      <textarea id="reason-input" rows="2" placeholder="例：情報が古かった、質問と違う内容だった など" style="width: 100%; margin-top: 4px; border-radius: 4px; border: 1px solid #ccc; padding: 4px;"></textarea>
      <button id="submit-reason" style="margin-top: 4px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">送信</button>
    `;
    scrollToBottom();

    container.querySelector("#submit-reason").addEventListener("click", () => {
      const reason = container.querySelector("#reason-input").value.trim();
      if (!reason) {
        alert("理由を入力してください。");
        return;
      }
      sendFeedback(question, answer, "not_useful", reason);
      container.innerHTML = "フィードバックありがとうございました！";
      scrollToBottom();
    });
  }

  function sendFeedback(question, answer, feedback, reason) {
    const payload = { question, answer, feedback, reason };
    fetch("https://faqbot-ngw3.onrender.com/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(res => res.json()).then(data => {
      console.log("サーバー応答:", data);
    }).catch(err => {
      console.error("送信エラー:", err);
    });
  }

  async function ask() {
    const question = input.value.trim();
    if (!question) return;

    const mode = responseMode?.value || "default"; // short / long / default
    appendMessage("ユーザー", question, "left");
    input.value = "";
    spinner.style.display = "block";

    try {
      const res = await fetch("https://faqbot-ngw3.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, mode })
      });

      if (!res.ok) throw new Error("Network error");

      const data = await res.json();
      const answer = data.response?.trim() || "申し訳ありません、回答を取得できませんでした。";
      appendMessage("サポート", answer, "right", question);
    } catch (err) {
      console.error("通信エラー:", err);
      appendMessage("サポート", "エラーが発生しました。", "right", question);
    } finally {
      spinner.style.display = "none";
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  });

  window.closeChat = function () {
    alert("チャットを閉じます（ここに閉じる処理を追加できます）");
  };
});
