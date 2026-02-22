/**
 * Agent Monitor Backend - Google Apps Script (With Gemini Integration)
 * 
 * 部署說明：
 * 1. 在 Google 試算表中點擊「擴充功能」>「Apps Script」
 * 2. 貼上此程式碼
 * 3. 點擊「部署」>「管理部署作業」>「編輯」> 選擇「新增版本」然後儲存
 */

const SHEET_STATUS = 'AgentStatus';
const SHEET_LOGS = 'EventLog';
const SHEET_STATE = 'SystemState';
const SHEET_PROMPTS = 'PromptTemplates';

// 初始化工作表
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let statusSheet = ss.getSheetByName(SHEET_STATUS);
  if (!statusSheet) {
    statusSheet = ss.insertSheet(SHEET_STATUS);
    statusSheet.appendRow(['Agent ID', 'Name', 'Role', 'Status', 'Progress', 'Last Event', 'Avatar', 'SystemPrompt']);
  }

  let logSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOGS);
    logSheet.appendRow(['Timestamp', 'Agent ID', 'Agent Name', 'Event', 'Action Type', 'Target Agent']);
  }

  let stateSheet = ss.getSheetByName(SHEET_STATE);
  if (!stateSheet) {
    stateSheet = ss.insertSheet(SHEET_STATE);
    stateSheet.appendRow(['Key', 'Value']);
    stateSheet.appendRow(['state', 'IDLE']);
    stateSheet.appendRow(['proposal', '']); // JSON string of proposed agents
  }

  let promptSheet = ss.getSheetByName(SHEET_PROMPTS);
  if (!promptSheet) {
    promptSheet = ss.insertSheet(SHEET_PROMPTS);
    promptSheet.appendRow(['ID', 'Name', 'Description', 'Prompt']);
  }
}

// 處理 GET 請求 (前端輪詢)
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let statusSheet = ss.getSheetByName(SHEET_STATUS);
  let logSheet = ss.getSheetByName(SHEET_LOGS);
  let stateSheet = ss.getSheetByName(SHEET_STATE);
  let promptSheet = ss.getSheetByName(SHEET_PROMPTS);
  
  // 容錯防呆：如果沒有 Sheet 幫他建
  if (!statusSheet || !logSheet || !stateSheet || !promptSheet) {
      initSheets();
      statusSheet = ss.getSheetByName(SHEET_STATUS);
      logSheet = ss.getSheetByName(SHEET_LOGS);
      stateSheet = ss.getSheetByName(SHEET_STATE);
      promptSheet = ss.getSheetByName(SHEET_PROMPTS);
  }

  // Get System State
  const stateData = stateSheet.getDataRange().getValues();
  let systemState = 'IDLE';
  let proposal = null;
  for (let i = 1; i < stateData.length; i++) {
      if (stateData[i][0] === 'state') systemState = stateData[i][1];
      if (stateData[i][0] === 'proposal' && stateData[i][1]) {
          try { proposal = JSON.parse(stateData[i][1]); } catch(e) {}
      }
  }

  const statusData = statusSheet.getDataRange().getValues();
  const agents = [];
  
  for (let i = 1; i < statusData.length; i++) {
    const row = statusData[i];
    if (row[0]) {
      agents.push({
        id: row[0],
        name: row[1],
        role: row[2],
        status: row[3],
        progress: Number(row[4]) || 0,
        lastEvent: row[5],
        avatar: row[6],
        prompt: row[7],
        log: []
      });
    }
  }

  const logData = logSheet.getDataRange().getValues();
  const logs = [];
  const activeLinks = [];
  
  const startRow = Math.max(1, logData.length - 20); 
  for (let i = logData.length - 1; i >= startRow; i--) {
    const row = logData[i];
    if (!row[0]) continue;
    
    // GAS 日期物件轉字串
    const timestampObj = new Date(row[0]);
    // 檢查 Invalid Date
    if (isNaN(timestampObj.getTime())) continue;

    const timestamp = timestampObj.toISOString();
    const agentId = row[1];
    const agentName = row[2];
    const event = row[3];
    const targetAgentId = row[5];
    
    const agentAvatar = agents.find(a => a.id === agentId)?.avatar || '/default.png';
    logs.push({
        id: timestamp + agentId,
        time: timestamp,
        agentId: agentId,
        agentName: agentName,
        event: event,
        avatar: agentAvatar
    });
    
    const agentObj = agents.find(a => a.id === agentId);
    if (agentObj && agentObj.log.length < 5) {
      agentObj.log.push(event);
    }
    
    const timeDiff = new Date() - timestampObj;
    if (targetAgentId && timeDiff < 30000) { 
        activeLinks.push({
            // Append the row index `i` to guarantee the ID is 100% unique even if timestamp is identical
            id: timestamp + agentId + targetAgentId + i,
            from: agentId,
            to: targetAgentId
        });
    }
  }

  const output = {
    systemState: systemState,
    proposal: proposal,
    agents: agents,
    globalEvents: logs,
    activeLinks: activeLinks
  };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====== 呼叫 Gemini 的 Helper Function ======
function callGeminiAPI(apiKey, instruction, agentId = 'pm') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  let promptText = '';
  
  if (agentId === 'dev') {
      promptText = `你是一個資深軟體工程師(Developer)。專案經理(PM)指派了任務給你：「${instruction}」。
請用**繁體中文**，用工程師的精明口吻(30字內)簡短回覆你將採取的技術行動。直接回答，不用加其他廢話。例如：「收到，我會開始建置 React 元件並串接後端 API。」`;
  } else if (agentId === 'design') {
      promptText = `你是一個 UI/UX 設計師(Designer)。專案經理(PM)指派了任務給你：「${instruction}」。
請用**繁體中文**，用設計師的專業口吻(30字內)簡短回覆你將採取的設計行動。直接回答，不用加廢話。例如：「沒問題，我會先拉出 Figma Wireframe 確認動線。」`;
  } else if (agentId === 'security') {
      promptText = `你是一個資安工程師(Security)。專案經理(PM)指派了任務給你：「${instruction}」。
請用**繁體中文**，用資安專家的嚴謹口吻(30字內)簡短回覆你會如何進行查核。直接回答，不用廢話。例如：「收到，我會優先盤點此流程中的資料欄位，進行滲透測試與漏洞掃描。」`;
  } else {
      // 預設為 PM
      promptText = `你是一個多代理人系統(Multi-Agent System)的專案經理(PM)。
團隊中有：
- dev (Developer - 工程師)
- design (Designer - 設計師)
- pm (Manager - 專案經理，也就是你)
- security (Security - 資安審核員)

使用者(Commander)給了你一個任務指令：「${instruction}」。
請用**繁體中文**，簡短地(30字以內)規劃這個任務要分配給誰，以及你(PM)現在的第一步動作。
請直接以第一人稱(PM)的口吻回答，例如：「收到，我會先請 Designer 設計畫面，然後交給 Dev 實作。」不用加其他廢話。`;
  }

  const payload = {
    "contents": [{
      "parts": [{ "text": promptText }]
    }]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      return result.candidates[0].content.parts[0].text.trim();
    } else {
      return "無法聯絡 Gemini 大腦，請檢查 API Key 是否正確。";
    }
  } catch (err) {
    return "API 發生錯誤：" + err.message;
  }
}

// 處理 POST 請求 (接收前端指令，呼叫 Gemini，寫入 Sheets)
function doPost(e) {
  // CORS 預檢允許
  if (typeof e.postData === 'undefined') {
    return ContentService.createTextOutput(JSON.stringify({error: "No POST payload."}))
        .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // -----------------------------------------
    // 動作: UPLOAD_PROMPTS (寫入 PromptTemplates 資料)
    // -----------------------------------------
    if (data.action === 'UPLOAD_PROMPTS') {
        const promptSheet = ss.getSheetByName(SHEET_PROMPTS);
        const prompts = data.prompts; // array of {id, name, description, prompt}
        
        // Clear existing, keep header
        if (promptSheet.getLastRow() > 1) {
             promptSheet.getRange(2, 1, promptSheet.getLastRow() - 1, 4).clearContent();
        }
        
        if (prompts && prompts.length > 0) {
            const values = prompts.map(p => [p.id, p.name, p.description, p.prompt]);
            promptSheet.getRange(2, 1, values.length, 4).setValues(values);
        }
        return ContentService.createTextOutput(JSON.stringify({success: true, count: prompts.length}))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // -----------------------------------------
    // 動作: START_PLANNING (大腦規劃招募名單)
    // -----------------------------------------
    if (data.action === 'START_PLANNING') {
        const instruction = data.instruction;
        const apiKey = data.apiKey;
        const promptSheet = ss.getSheetByName(SHEET_PROMPTS);
        const stateSheet = ss.getSheetByName(SHEET_STATE);
        
        // 1. 取得所有可用的角色範本
        const promptData = promptSheet.getDataRange().getValues();
        const availableRoles = [];
        for (let i = 1; i < promptData.length; i++) {
            if (promptData[i][0]) {
                availableRoles.push({
                    id: promptData[i][0],
                    name: promptData[i][1],
                    description: promptData[i][2]
                });
            }
        }
        
        // Write the Commander instruction to log so everyone knows what the task is
        const logSheet = ss.getSheetByName(SHEET_LOGS);
        logSheet.appendRow([
            new Date(), 'commander', 'Commander', `發布任務: "${instruction}"`, 'acting', ''
        ]);
        
        // 2. 組合給大腦 (Gemini) 的 Prompt
        const brainPrompt = `你是一個資深的 IT 專案架構師。
使用者交辦了一個任務：「${instruction}」。
請從以下可用的人才庫中，挑選最適合執行此任務的 2 到 4 名專家組成團隊。

【可用人才庫】
${JSON.stringify(availableRoles, null, 2)}

請「嚴格」以下列 JSON 格式輸出你的招募提案（不要包含 markdown 標籤，只要純 JSON 字串）：
{
  "reasoning": "簡短解釋為什麼選這些人以及他們將如何協作",
  "hired_agents": [
    {
      "id": "選擇的腳色 ID (必須與人才庫完全一致)",
      "justification": "為什麼需要這個人 (一句話)"
    }
  ]
}`;

        // 3. 呼叫 Gemini 取得 JSON
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            "contents": [{"parts": [{"text": brainPrompt}]}],
            "generationConfig": { "responseMimeType": "application/json" }
        };
        const options = {
            "method": "post",
            "contentType": "application/json",
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };
        
        const response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() === 429) {
             return ContentService.createTextOutput(JSON.stringify({error: "RATE_LIMIT_EXCEEDED", code: 429}))
                 .setMimeType(ContentService.MimeType.JSON);
        } else if (response.getResponseCode() !== 200) {
             throw new Error("Gemini API Error: " + response.getContentText());
        }
        
        const result = JSON.parse(response.getContentText());
        const proposalJsonStr = result.candidates[0].content.parts[0].text;
        
        // 4. 解析確認並提取完整的 Agent 資訊 (結合 Avatar / Color 等)
        let proposalObj = JSON.parse(proposalJsonStr);
        proposalObj.hired_agents = proposalObj.hired_agents.map(hired => {
             const original = availableRoles.find(r => r.id === hired.id);
             
             // 根據角色 ID 動態分配專屬頭像
             let assignedAvatar = '/default.png';
             const roleId = hired.id.toLowerCase();
             
             if (roleId.includes('frontend')) assignedAvatar = '/frontend.png';
             else if (roleId.includes('backend') || roleId.includes('db')) assignedAvatar = '/backend.png';
             else if (roleId.includes('qa') || roleId.includes('test')) assignedAvatar = '/qa.png';
             else if (roleId.includes('data')) assignedAvatar = '/data.png';
             else if (roleId.includes('devops') || roleId.includes('cloud')) assignedAvatar = '/devops.png';
             else if (roleId.includes('design')) assignedAvatar = '/design.png';
             else if (roleId.includes('secur')) assignedAvatar = '/security.png';
             else if (roleId.includes('pm') || roleId.includes('manager')) assignedAvatar = '/pm.png';
             else if (roleId.includes('dev')) assignedAvatar = '/dev.png';

             return {
                 id: hired.id,
                 name: original ? original.name : hired.id,
                 role: original ? original.description.substring(0, 20) + '...' : 'Specialist',
                 justification: hired.justification,
                 avatar: assignedAvatar
             };
        });
        
        const finalProposalStr = JSON.stringify(proposalObj);
        
        // 5. 更新系統狀態與寫入提案
        const stateData = stateSheet.getDataRange().getValues();
        for (let i = 1; i < stateData.length; i++) {
            if (stateData[i][0] === 'state') stateSheet.getRange(i+1, 2).setValue('HIRING_APPROVAL');
            if (stateData[i][0] === 'proposal') stateSheet.getRange(i+1, 2).setValue(finalProposalStr);
        }
        
        return ContentService.createTextOutput(JSON.stringify({
            success: true, 
            message: "提案已產出",
            proposal: proposalObj
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // -----------------------------------------
    // 動作: REJECT_HIRING (拒絕提案)
    // -----------------------------------------
    if (data.action === 'REJECT_HIRING') {
        const stateSheet = ss.getSheetByName(SHEET_STATE);
        const stateData = stateSheet.getDataRange().getValues();
        for (let i = 1; i < stateData.length; i++) {
            if (stateData[i][0] === 'state') stateSheet.getRange(i+1, 2).setValue('IDLE');
            if (stateData[i][0] === 'proposal') stateSheet.getRange(i+1, 2).setValue('');
        }
        return ContentService.createTextOutput(JSON.stringify({success: true, message: "已拒絕提案，重置為待機狀態"}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    
    // -----------------------------------------
    // 動作: APPROVE_HIRING (核准提案並建立團隊)
    // -----------------------------------------
    if (data.action === 'APPROVE_HIRING') {
        const proposal = data.proposal;
        const statusSheet = ss.getSheetByName(SHEET_STATUS);
        const stateSheet = ss.getSheetByName(SHEET_STATE);
        const promptSheet = ss.getSheetByName(SHEET_PROMPTS);
        
        // 1. 取得所有 Prompt
        const promptData = promptSheet.getDataRange().getValues();
        const promptMap = {};
        for(let i=1; i<promptData.length; i++) {
             promptMap[promptData[i][0]] = promptData[i][3]; // ID -> PromptText
        }
        
        // 2. 清空舊的 AgentStatus
        if (statusSheet.getLastRow() > 1) {
            statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, statusSheet.getLastColumn()).clearContent();
        }
        
        // 3. 寫入新的動態 Agent
        // 強制安插一個 Commander 作為觀察者，以及一個臨時 PM 作為 Leader?
        // 不，完全以 Proposal 內容為主。
        const agentRows = proposal.hired_agents.map(h => {
             const sysPrompt = promptMap[h.id] || "You are an AI specialist.";
             return [
                 h.id, 
                 h.name, 
                 h.role, 
                 'thinking', 
                 0, 
                 'Ready and waiting for instructions...', 
                 h.avatar,
                 sysPrompt
             ];
        });
        
        if (agentRows.length > 0) {
            statusSheet.getRange(2, 1, agentRows.length, agentRows[0].length).setValues(agentRows);
        }
        
        // 4. 更新系統狀態至 DISCUSSION_LOOP
        const stateData = stateSheet.getDataRange().getValues();
        for (let i = 1; i < stateData.length; i++) {
            if (stateData[i][0] === 'state') stateSheet.getRange(i+1, 2).setValue('DISCUSSION_LOOP');
            if (stateData[i][0] === 'proposal') stateSheet.getRange(i+1, 2).setValue('');
        }
        
        return ContentService.createTextOutput(JSON.stringify({
            success: true, 
            message: "團隊已成功組建，進入討論階段！"
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // -----------------------------------------
    // 動作: NEXT_TURN (執行下一回合討論)
    // -----------------------------------------
    if (data.action === 'NEXT_TURN') {
        const apiKey = data.apiKey;
        const stateSheet = ss.getSheetByName(SHEET_STATE);
        const statusSheet = ss.getSheetByName(SHEET_STATUS);
        const logSheet = ss.getSheetByName(SHEET_LOGS);
        
        let systemState = 'IDLE';
        let stateRowIndex = -1;
        const stateData = stateSheet.getDataRange().getValues();
        for (let i = 1; i < stateData.length; i++) {
            if (stateData[i][0] === 'state') {
                systemState = stateData[i][1];
                stateRowIndex = i + 1;
            }
        }
        
        if (systemState !== 'DISCUSSION_LOOP') {
            return ContentService.createTextOutput(JSON.stringify({success: false, message: "不在討論狀態"})).setMimeType(ContentService.MimeType.JSON);
        }

        const agentData = statusSheet.getDataRange().getValues();
        let agents = [];
        for(let i=1; i<agentData.length; i++){
            if(agentData[i][0]) {
                agents.push({
                    id: agentData[i][0],
                    name: agentData[i][1],
                    role: agentData[i][2],
                    prompt: agentData[i][7] || 'You are an AI assistant.',
                    rowIndex: i + 1
                });
            }
        }

        if (agents.length === 0) {
            return ContentService.createTextOutput(JSON.stringify({error: "沒有活著的 Agent 可以發言"})).setMimeType(ContentService.MimeType.JSON);
        }

        // Get recent logs
        const logData = logSheet.getDataRange().getValues();
        let discussionLogs = [];
        let discussionTurns = 0;
        
        // 取最近 15 筆記錄作為 Context
        for(let i = Math.max(1, logData.length - 15); i < logData.length; i++){
            // skip invalid rows
            if (!logData[i][0]) continue;
            discussionLogs.push(`${logData[i][2]}: ${logData[i][3]}`);
            if (logData[i][1] !== 'commander') discussionTurns++;
        }

        // Determine next speaker (Round-Robin)
        let lastSpeakerId = null;
        if (logData.length > 1 && logData[logData.length - 1][1]) {
            lastSpeakerId = logData[logData.length - 1][1];
        }

        let nextAgentIndex = 0;
        if (lastSpeakerId && lastSpeakerId !== 'commander') {
            const lastIdx = agents.findIndex(a => a.id === lastSpeakerId);
            if (lastIdx !== -1) {
                nextAgentIndex = (lastIdx + 1) % agents.length;
            }
        }
        const currentAgent = agents[nextAgentIndex];
        const prevAgent = agents[(nextAgentIndex - 1 + agents.length) % agents.length]; // who to draw line from

        // Check if we should conclude
        if (discussionTurns > 20) { // Force conclude after 20 turns
            stateSheet.getRange(stateRowIndex, 2).setValue('FINAL_REVIEW');
            return ContentService.createTextOutput(JSON.stringify({success: true, message: "強制收斂"})).setMimeType(ContentService.MimeType.JSON);
        }

        statusSheet.getRange(currentAgent.rowIndex, 4).setValue('thinking');

        // Prepare Prompt
        const promptText = `你是 ${currentAgent.name} (${currentAgent.role})。
你的核心職責與專業設定：
${currentAgent.prompt}

---
以下是團隊最近的對話紀錄：
${discussionLogs.join("\n")}

請根據你的專業領域，延續對話並提出你的見解。
* 必用**繁體中文**回答。
* 字數請控制在 50 字內，直接給出具體分析或行動宣告，不要客套虛偽廢話。
* 如果你強烈認為任務細節已經可以完美收結，討論不需要再繼續，且你是負責收尾的人，請在回答的最前面加上 "[CONCLUSION]" 標籤，然後給出最終結論摘要。
`;
        
        // 呼叫 Gemini 的核心 Generator API
        // 因為 callGeminiAPI 目前寫死 promptText，我們最好直接複製其 fetch 邏輯或修改 callGeminiAPI 支援 rawPrompt。
        // 為了相容，直接展開 fetch：
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            "contents": [{"parts": [{"text": promptText}]}]
        };
        const options = {
            "method": "post",
            "contentType": "application/json",
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };
        
        const response = UrlFetchApp.fetch(url, options);
        let reply = "出錯了，無法思考。";
        if (response.getResponseCode() === 200) {
            const result = JSON.parse(response.getContentText());
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
                reply = result.candidates[0].content.parts[0].text.trim();
            } else {
                reply = "被 Gemini 安全機制阻擋或無回應內容。";
            }
        } else if (response.getResponseCode() === 429) {
            // Return 429 so the frontend knows to rotate API keys
            return ContentService.createTextOutput(JSON.stringify({error: "RATE_LIMIT_EXCEEDED", code: 429}))
                 .setMimeType(ContentService.MimeType.JSON);
        } else {
            const errStr = response.getContentText().replace(/\n/g, ' ').substring(0, 100);
            reply = `API 錯誤 (${response.getResponseCode()}): ${errStr}`;
        }

        let conclude = false;
        if (reply.includes('[CONCLUSION]')) {
            conclude = true;
            reply = reply.replace('[CONCLUSION]', '').trim();
        }
        if (reply.includes('CONCLUSION')) {
            conclude = true;
            reply = reply.replace('CONCLUSION', '').replace(/\[\]/g,'').trim();
        }

        statusSheet.getRange(currentAgent.rowIndex, 4).setValue('acting');
        statusSheet.getRange(currentAgent.rowIndex, 5).setValue(Math.min(100, 10 + Math.floor(discussionTurns/20 * 90))); // Fake progress
        statusSheet.getRange(currentAgent.rowIndex, 6).setValue(reply);

        // write Log
        logSheet.appendRow([
            new Date(), currentAgent.id, currentAgent.name, reply, 'acting', prevAgent.id
        ]);

        if (conclude || discussionTurns > 20) {
            stateSheet.getRange(stateRowIndex, 2).setValue('FINAL_REVIEW');
            // Write final conclusion to proposal field so frontend can grab it easily
            for (let i = 1; i < stateData.length; i++) {
                if (stateData[i][0] === 'proposal') {
                     stateSheet.getRange(i+1, 2).setValue(reply);
                }
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true, 
            speaker: currentAgent.name,
            reply: reply
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // -----------------------------------------
    // 動作: RESET_SYSTEM (結束此輪任務，重置系統回待機)
    // -----------------------------------------
    if (data.action === 'RESET_SYSTEM') {
        const stateSheet = ss.getSheetByName(SHEET_STATE);
        const statusSheet = ss.getSheetByName(SHEET_STATUS);
        const logSheet = ss.getSheetByName(SHEET_LOGS);
        
        // 1. 恢復 IDLE
        const stateData = stateSheet.getDataRange().getValues();
        for (let i = 1; i < stateData.length; i++) {
            if (stateData[i][0] === 'state') stateSheet.getRange(i+1, 2).setValue('IDLE');
            if (stateData[i][0] === 'proposal') stateSheet.getRange(i+1, 2).setValue('');
        }
        
        // 2. 清空 EventLog（保留標題列）
        if (logSheet.getLastRow() > 1) {
            logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).clearContent();
        }
        
        // 3. 清空自訂 Agent，重建預設 4 人
        if (statusSheet.getLastRow() > 1) {
            statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, statusSheet.getLastColumn()).clearContent();
        }
        statusSheet.appendRow(['dev', 'Developer', 'Engineering', 'thinking', 0, 'Ready', '/dev.png', 'You are a dev.']);
        statusSheet.appendRow(['design', 'Designer', 'UI/UX', 'thinking', 0, 'Ready', '/design.png', 'You are a designer.']);
        statusSheet.appendRow(['pm', 'Manager', 'Coordination', 'thinking', 0, 'Ready', '/pm.png', 'You are a PM.']);
        statusSheet.appendRow(['security', 'Security', 'Safety', 'thinking', 0, 'Ready', '/security.png', 'You are a security expert.']);
        
        return ContentService.createTextOutput(JSON.stringify({success: true, message: "系統已重置"}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: "Unknown action"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 支援 CORS Preflight 請求
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
\n// --- Force Auth Helper ---\nfunction forceAuth() {\n  UrlFetchApp.fetch('https://www.google.com');\n}
