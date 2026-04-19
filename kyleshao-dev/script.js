const projectData = [
  {
    name: "云剪贴板",
    desc: "轻量云剪贴板，支持快速分享、历史管理与链接复制。",
    tags: ["Web", "Netlify", "Supabase"],
    siteUrl: "https://clipboard.kyleshao-blog.top",
    status: "已上线",
    downloads: []
  },
  {
    name: "博客",
    desc: "全栈博客系统，涵盖文章、评论、作者与管理后台。",
    tags: ["Web", "Fullstack"],
    siteUrl: "https://blog.kyleshao-blog.top",
    status: "已上线",
    downloads: []
  },
  {
    name: "论坛",
    desc: "社区论坛与话题讨论区，支持 OAuth 登录与内容管理。",
    tags: ["Web", "Community"],
    siteUrl: "https://forum.kyleshao-blog.top",
    status: "已上线",
    downloads: []
  },
  {
    name: "文明",
    desc: "本地策略/模拟应用，支持桌面端运行与存档管理。",
    tags: ["Desktop", "Game"],
    siteUrl: "https://forum.kyleshao-blog.top/download/civilization",
    status: "本地应用",
    downloads: [
      { label: "下载页", url: "https://forum.kyleshao-blog.top/download/civilization" }
    ]
  },
  {
    name: "耗材管理系统",
    desc: "耗材入库、领用与统计管理，附带桌面端与小程序。",
    tags: ["Desktop", "Inventory"],
    siteUrl: "https://forum.kyleshao-blog.top/download/civilization",
    status: "本地应用",
    downloads: [
      { label: "下载页", url: "https://forum.kyleshao-blog.top/download/civilization" }
    ]
  }
];

const downloadData = [
  {
    name: "文明",
    desc: "策略模拟桌面版。",
    links: [
      { label: "下载页", url: "https://forum.kyleshao-blog.top/download/civilization" }
    ]
  },
  {
    name: "耗材管理系统",
    desc: "桌面端与小程序入口。",
    links: [
      { label: "下载页", url: "https://forum.kyleshao-blog.top/download/civilization" },
      { label: "小程序目录", url: "../耗材管理系统/wx-miniprogram" }
    ]
  },
  {
    name: "博客小程序",
    desc: "博客内容快速浏览与编辑。",
    links: [{ label: "小程序目录", url: "../博客/blog-fullstack/miniprogram" }]
  }
];

const issuer = window.location.origin;
let oauthConfig = {
  blog: {
    clientId: "",
    redirectUri: "https://blog.kyleshao-blog.top/api/auth/kydev/callback"
  },
  forum: {
    clientId: "",
    redirectUri: "https://forum.kyleshao-blog.top/api/auth/kydev/callback"
  },
  clipboard: {
    clientId: "",
    redirectUri: "https://clipboard.kyleshao-blog.top/api/kydev/callback"
  }
};

const projectGrid = document.getElementById("projectGrid");
const downloadGrid = document.getElementById("downloadGrid");
const registerForm = document.getElementById("registerForm");
const tokenBox = document.getElementById("tokenBox");
const tokenValue = document.getElementById("tokenValue");
const toast = document.getElementById("toast");
const mergeBox = document.getElementById("mergeBox");
const mergeText = document.getElementById("mergeText");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const modeButtons = document.querySelectorAll(".mode-switch button");

let currentUser = null;
let currentToken = localStorage.getItem("kydev_token") || "";
let authMode = "register";

function renderProjects() {
  projectGrid.innerHTML = projectData
    .map((project) => {
      const siteButton = project.siteUrl
        ? `<a class="primary" href="${project.siteUrl}">进入站点</a>`
        : `<button class="ghost" disabled>站点待配置</button>`;

      const downloadButton = project.downloads.length
        ? `<a class="ghost" href="#downloads">下载应用</a>`
        : "";

      return `
        <article class="card">
          <div class="tag-row">
            ${project.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
          <h3>${project.name}</h3>
          <p>${project.desc}</p>
          <p class="hint">${project.status}</p>
          <div class="card-actions">
            ${siteButton}
            ${downloadButton}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDownloads() {
  downloadGrid.innerHTML = downloadData
    .map((item) => {
      return `
        <article class="card">
          <h3>${item.name}</h3>
          <p>${item.desc}</p>
          <div class="card-actions">
            ${item.links
              .map((link) => `<a class="ghost" href="${link.url}">${link.label}</a>`)
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.remove("hide");
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 2200);
}

async function apiPost(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function fetchMe(token) {
  const res = await fetch("/api/oauth-userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return res.json();
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = formData.get("username").trim();
  const email = formData.get("email").trim();
  const password = formData.get("password");

  try {
    const payload =
      authMode === "register"
        ? { username, email, password }
        : { identifier: username || email, password };
    const data = await apiPost(authMode === "register" ? "/api/register" : "/api/login", payload);
    currentToken = data.token;
    localStorage.setItem("kydev_token", currentToken);
    currentUser = data.user || { username, email };
    tokenValue.textContent = currentToken;
    tokenBox.hidden = false;
    showToast(authMode === "register" ? `已创建账号：${currentUser.username}` : `已登录：${currentUser.username}`);
  } catch (err) {
    showToast(err.message);
  }
}

async function initFromToken() {
  if (!currentToken) return;
  const user = await fetchMe(currentToken);
  if (user) {
    currentUser = { username: user.username, email: user.email };
    tokenValue.textContent = currentToken;
    tokenBox.hidden = false;
  }
}

async function loadOAuthConfig() {
  try {
    const res = await fetch("/api/oauth-config");
    if (!res.ok) return;
    const data = await res.json();
    oauthConfig = { ...oauthConfig, ...data };
  } catch (_err) {
    // ignore
  }
}

function handleOAuth(siteKey) {
  const config = oauthConfig[siteKey];
  if (!config?.clientId || !config?.redirectUri) {
    showToast("OAuth 未配置 clientId 或回调地址");
    return;
  }
  if (!currentToken) {
    showToast("请先注册或登录 kyleshao-dev 账号");
    return;
  }
  const url = new URL(`${issuer}/api/oauth-authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", `${siteKey}-${Date.now()}`);
  url.searchParams.set("token", currentToken);
  mergeBox.hidden = true;
  window.location.href = url.toString();
}

function siteLabel(key) {
  switch (key) {
    case "blog":
      return "博客";
    case "forum":
      return "论坛";
    case "clipboard":
      return "云剪贴板";
    default:
      return "目标站点";
  }
}

document.querySelectorAll("[data-action='scroll-projects']").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("projects").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll("[data-action='open-register']").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("account").scrollIntoView({ behavior: "smooth" });
    registerForm.querySelector("input[name='username']").focus();
  });
});

document.querySelectorAll("[data-action='open-oauth']").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("account").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll(".oauth-buttons button").forEach((button) => {
  button.addEventListener("click", () => handleOAuth(button.dataset.site));
});

document.querySelector("[data-action='ack-merge']").addEventListener("click", () => {
  mergeBox.hidden = true;
});

document.querySelector("[data-action='copy-token']").addEventListener("click", () => {
  navigator.clipboard.writeText(tokenValue.textContent).then(() => {
    showToast("Token 已复制");
  });
});

registerForm.addEventListener("submit", handleRegister);

renderProjects();
renderDownloads();
initFromToken();
loadOAuthConfig();

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    authMode = btn.dataset.mode;
    formTitle.textContent = authMode === "register" ? "注册 kyleshao-dev" : "登录 kyleshao-dev";
    submitBtn.textContent = authMode === "register" ? "创建账号" : "登录账号";
    const nameField = registerForm.querySelector("input[name='username']");
    nameField.required = authMode === "register";
  });
});
