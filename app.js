// Import Firebase SDK functions from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  updateDoc,
  query, 
  where,
  onSnapshot, 
  getDocs,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase configuration for secret-area-60f05
const firebaseConfig = {
  apiKey: "AIzaSyD-YOUR-API-KEY-HERE", 
  authDomain: "secret-area-60f05.firebaseapp.com",
  projectId: "secret-area-60f05",
  storageBucket: "secret-area-60f05.appspot.com",
  messagingSenderId: "776995915030",
  appId: "1:776995915030:web:secretchat"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// SVG Checkmark Component with White Check, Green Fill, and Layered Glow Effect
const VerifiedBadge = () => (
  <svg style={styles.verifiedBadgeStyle} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#00ff66" />
    <path fill="#ffffff" d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z"/>
  </svg>
);

// Glowing Green Comment Box Badge Component
const GlowBadge = () => (
  <span style={styles.glowBadgeStyle} title="Active @#18#@ Mode">
    💬
  </span>
);

function ChatApp() {
  const [currentUser, setCurrentUser] = React.useState(() => {
    const saved = localStorage.getItem("secretchat_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = React.useState("login");
  const [authUsername, setAuthUsername] = React.useState("");
  const [authPassword, setAuthPassword] = React.useState("");
  const [authAvatar, setAuthAvatar] = React.useState(""); 
  const [authError, setAuthError] = React.useState("");

  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [view, setView] = React.useState("chat");
  const [currentGroup, setCurrentGroup] = React.useState(null);

  const [groups, setGroups] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pinned Groups State
  const [pinnedGroupIds, setPinnedGroupIds] = React.useState(() => {
    const saved = localStorage.getItem("secretchat_pins");
    return saved ? JSON.parse(saved) : [];
  });

  // Long-press Context Menu State for Groups
  const [groupContextMenuTarget, setGroupContextMenuTarget] = React.useState(null);

  // Group Info Modal State
  const [groupInfoTarget, setGroupInfoTarget] = React.useState(null);
  const [onlineMembers, setOnlineMembers] = React.useState([]);

  // Message Options Modal / Delete State
  const [selectedMessageForAction, setSelectedMessageForAction] = React.useState(null);

  // In-App Image Fullscreen Zoom Preview State
  const [fullscreenImageSrc, setFullscreenImageSrc] = React.useState(null);
  const [imageZoomScale, setImageZoomScale] = React.useState(1);

  const [newGroupName, setNewGroupName] = React.useState("");
  const [groupType, setGroupType] = React.useState("public"); 
  const [groupPassword, setGroupPassword] = React.useState("");
  const [privateVisibility, setPrivateVisibility] = React.useState("visible"); 
  const [newGroupAvatar, setNewGroupAvatar] = React.useState(""); 
  const [createError, setCreateError] = React.useState("");

  const [editGroupName, setEditGroupName] = React.useState("");
  const [editGroupPassword, setEditGroupPassword] = React.useState("");
  const [editGroupAvatar, setEditGroupAvatar] = React.useState("");
  const [editGroupVerified, setEditGroupVerified] = React.useState(false);

  const [editProfileAvatar, setEditProfileAvatar] = React.useState("");

  const [selectedGroupToJoin, setSelectedGroupToJoin] = React.useState(null);
  const [joinPasswordInput, setJoinPasswordInput] = React.useState("");
  const [joinError, setJoinError] = React.useState("");

  const [secretCodeInput, setSecretCodeInput] = React.useState("");
  const [secretSearchError, setSecretSearchError] = React.useState("");

  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState("");
  const [imagePreview, setImagePreview] = React.useState(null); 
  const messagesEndRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (currentUser) {
      localStorage.setItem("secretchat_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("secretchat_user");
    }
  }, [currentUser]);

  React.useEffect(() => {
    localStorage.setItem("secretchat_pins", JSON.stringify(pinnedGroupIds));
  }, [pinnedGroupIds]);

  // Presence / Active Members heartbeat simulation
  React.useEffect(() => {
    if (!currentUser) return;
    const heartbeatRef = collection(db, "presence");
    const updatePresence = async () => {
      try {
        const q = query(heartbeatRef, where("username", "==", currentUser.username));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(heartbeatRef, { username: currentUser.username, lastSeen: serverTimestamp() });
        } else {
          await updateDoc(doc(db, "presence", snap.docs[0].id), { lastSeen: serverTimestamp() });
        }
      } catch (e) {
        console.error("Presence error:", e);
      }
    };
    updatePresence();
    const interval = setInterval(updatePresence, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Fetch Public & Visible Private groups
  React.useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "groups"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.visibility !== "secret") {
          groupList.push({ id: doc.id, ...data });
        }
      });
      setGroups(groupList);

      if (!currentGroup && groupList.length > 0) {
        const hackerBlox = groupList.find(g => g.name === "Hacker_blox");
        setCurrentGroup(hackerBlox || groupList[0]);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for current user profile changes
  React.useEffect(() => {
    if (!currentUser?.username) return;
    const userQuery = query(collection(db, "users"), where("username", "==", currentUser.username));
    const unsubscribeUser = onSnapshot(userQuery, (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        setCurrentUser({ 
          username: data.username, 
          avatar: data.avatar || "", 
          verified: data.verified || false,
          glowBadge: data.glowBadge || false 
        });
      });
    });
    return () => unsubscribeUser();
  }, [currentUser?.username]);

  // Real-time listener for messages in current group
  React.useEffect(() => {
    if (currentUser && currentGroup) {
      const q = query(collection(db, "messages"), where("groupId", "==", currentGroup.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = [];
        const hiddenIds = JSON.parse(localStorage.getItem(`hidden_msgs_${currentUser.username}`) || "[]");
        snapshot.forEach((docSnap) => {
          if (!hiddenIds.includes(docSnap.id)) {
            msgs.push({ id: docSnap.id, ...docSnap.data() });
          }
        });
        msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        setMessages(msgs);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
      return () => unsubscribe();
    }
  }, [currentUser, currentGroup]);

  const handleImageResize = (file, callback, maxWidth = 150, maxHeight = 150) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleChatImageResize = (file, callback) => {
    handleImageResize(file, callback, 600, 600);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    const uname = authUsername.trim();
    const upass = authPassword.trim();
    if (!uname || !upass) return;

    try {
      const q = query(collection(db, "users"), where("username", "==", uname));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAuthError("Username already taken!");
        return;
      }
      await addDoc(collection(db, "users"), { 
        username: uname, 
        password: upass, 
        avatar: authAvatar || "",
        verified: false,
        glowBadge: false 
      });
      setCurrentUser({ username: uname, avatar: authAvatar || "", verified: false, glowBadge: false });
      setAuthUsername(""); setAuthPassword(""); setAuthAvatar("");
    } catch (err) {
      console.error(err);
      setAuthError("Registration failed.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const uname = authUsername.trim();
    const upass = authPassword.trim();
    if (!uname || !upass) return;

    try {
      const q = query(collection(db, "users"), where("username", "==", uname), where("password", "==", upass));
      const snap = await getDocs(q);
      if (snap.empty) {
        setAuthError("Invalid username or password.");
        return;
      }
      const userData = snap.docs[0].data();
      setCurrentUser({ 
        username: uname, 
        avatar: userData.avatar || "", 
        verified: userData.verified || false,
        glowBadge: userData.glowBadge || false 
      });
      setAuthUsername(""); setAuthPassword("");
    } catch (err) {
      console.error(err);
      setAuthError("Login failed.");
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentGroup(null);
    setIsDrawerOpen(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const userQuery = query(collection(db, "users"), where("username", "==", currentUser.username));
      const snap = await getDocs(userQuery);
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { avatar: editProfileAvatar });
        setCurrentUser({ ...currentUser, avatar: editProfileAvatar });
        setView("chat");
        setIsDrawerOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVerification = async (targetItem, type) => {
    if (currentUser.username !== "Bloxypro_18") {
      alert("Only Bloxypro_18 has permission to grant verification checkmarks!");
      return;
    }

    try {
      if (type === "group") {
        const groupRef = doc(db, "groups", targetItem.id);
        const newVerifiedStatus = !targetItem.verified;
        await updateDoc(groupRef, { verified: newVerifiedStatus });
        setCurrentGroup({ ...currentGroup, verified: newVerifiedStatus });
        setGroupContextMenuTarget(null);
      } else if (type === "user") {
        const userQuery = query(collection(db, "users"), where("username", "==", targetItem));
        const snap = await getDocs(userQuery);
        if (!snap.empty) {
          const userDocRef = doc(db, "users", snap.docs[0].id);
          const currentStatus = snap.docs[0].data().verified || false;
          await updateDoc(userDocRef, { verified: !currentStatus });
          alert(`Verification status toggled for user: ${targetItem}`);
          setGroupContextMenuTarget(null);
        }
      }
    } catch (err) {
      console.error("Error toggling verification:", err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateError("");
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    if (groupType === "private" && groupPassword.length < 4) {
      setCreateError("Private password should be at least 4 characters.");
      return;
    }

    try {
      const q = query(collection(db, "groups"), where("name", "==", trimmedName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setCreateError("A group with this name already exists!");
        return;
      }

      const newGroupData = {
        name: trimmedName,
        type: groupType, 
        password: groupType === "private" ? groupPassword : "",
        visibility: groupType === "private" ? privateVisibility : "visible", 
        avatar: newGroupAvatar || "",
        owner: currentUser.username,
        verified: false, 
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "groups"), newGroupData);
      setCurrentGroup({ id: docRef.id, ...newGroupData });
      setIsDrawerOpen(false);
      setView("chat");
      setNewGroupName(""); setGroupPassword(""); setNewGroupAvatar("");
    } catch (err) {
      console.error(err);
      setCreateError("Failed to create group.");
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!currentGroup || currentGroup.owner !== currentUser.username) return;

    try {
      const groupRef = doc(db, "groups", currentGroup.id);
      const updateData = {
        name: editGroupName.trim() || currentGroup.name,
        password: editGroupPassword !== "" ? editGroupPassword : currentGroup.password,
        avatar: editGroupAvatar,
        verified: editGroupVerified
      };
      await updateDoc(groupRef, updateData);
      setCurrentGroup({ ...currentGroup, ...updateData });
      setView("chat");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentGroup || currentGroup.owner !== currentUser.username) return;
    if (currentGroup.name === "Hacker_blox") {
      alert("Hacker_blox server cannot be deleted!");
      return;
    }
    if (!confirm("Are you sure you want to delete this group permanently?")) return;

    try {
      await deleteDoc(doc(db, "groups", currentGroup.id));
      setCurrentGroup(null);
      setView("chat");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectGroup = (group) => {
    if (group.type === "public") {
      setCurrentGroup(group);
      setIsDrawerOpen(false);
      setView("chat");
    } else {
      setSelectedGroupToJoin(group);
      setJoinPasswordInput("");
      setJoinError("");
    }
  };

  const handleTogglePinFromContext = (group) => {
    if (group.name === "Hacker_blox") return;
    if (pinnedGroupIds.includes(group.id)) {
      setPinnedGroupIds(pinnedGroupIds.filter(id => id !== group.id));
    } else {
      if (pinnedGroupIds.length >= 3) {
        alert("You can only pin up to 3 custom groups!");
        return;
      }
      setPinnedGroupIds([...pinnedGroupIds, group.id]);
    }
    setGroupContextMenuTarget(null);
  };

  const handleOpenInfoFromContext = async (group) => {
    setGroupContextMenuTarget(null);
    try {
      const presSnap = await getDocs(collection(db, "presence"));
      const activeUsers = [];
      const now = Date.now();
      presSnap.forEach(d => {
        const data = d.data();
        if (data.lastSeen && (now - data.lastSeen.toMillis() < 40000)) {
          activeUsers.push(data.username);
        }
      });
      setOnlineMembers(activeUsers);
      setGroupInfoTarget(group);
    } catch (e) {
      console.error(e);
      setOnlineMembers([currentUser.username]);
      setGroupInfoTarget(group);
    }
  };

  const handleVerifyJoinPassword = (e) => {
    e.preventDefault();
    if (joinPasswordInput === selectedGroupToJoin.password) {
      setCurrentGroup(selectedGroupToJoin);
      setSelectedGroupToJoin(null);
      setIsDrawerOpen(false);
      setView("chat");
    } else {
      setJoinError("Incorrect password!");
    }
  };

  const handleSearchSecretGroup = async (e) => {
    e.preventDefault();
    setSecretSearchError("");
    const code = secretCodeInput.trim();
    if (!code) return;

    try {
      const q = query(collection(db, "groups"), where("password", "==", code), where("visibility", "==", "secret"));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setSecretSearchError("No secret group found with that code.");
      } else {
        const docSnap = querySnapshot.docs[0];
        setCurrentGroup({ id: docSnap.id, ...docSnap.data() });
        setSecretCodeInput("");
        setIsDrawerOpen(false);
        setView("chat");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !imagePreview) || !currentGroup) return;

    let textToSend = inputText;
    let newGlowBadgeStatus = currentUser.glowBadge || false;

    if (inputText.trim() === "@#18#@") {
      newGlowBadgeStatus = !newGlowBadgeStatus;
      try {
        const userQuery = query(collection(db, "users"), where("username", "==", currentUser.username));
        const snap = await getDocs(userQuery);
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), { glowBadge: newGlowBadgeStatus });
        }
      } catch (err) {
        console.error("Error updating glow badge status:", err);
      }
      setCurrentUser({ ...currentUser, glowBadge: newGlowBadgeStatus });
      setInputText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        groupId: currentGroup.id,
        text: textToSend,
        image: imagePreview || null,
        user: currentUser.username,
        userAvatar: currentUser.avatar || "",
        userVerified: currentUser.verified || false,
        userGlowBadge: currentUser.glowBadge || false,
        createdAt: serverTimestamp()
      });
      setInputText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteForEveryone = async (msgId) => {
    try {
      await deleteDoc(doc(db, "messages", msgId));
      setSelectedMessageForAction(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteForMe = (msgId) => {
    const hiddenKey = `hidden_msgs_${currentUser.username}`;
    const hiddenIds = JSON.parse(localStorage.getItem(hiddenKey) || "[]");
    if (!hiddenIds.includes(msgId)) {
      hiddenIds.push(msgId);
      localStorage.setItem(hiddenKey, JSON.stringify(hiddenIds));
    }
    setMessages(messages.filter(m => m.id !== msgId));
    setSelectedMessageForAction(null);
  };

  if (!currentUser) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <h2>Secret-Chat</h2>
          <p style={{ fontSize: "13px", color: "#666" }}>{authMode === "login" ? "Sign in to your account" : "Create a new account"}</p>
          {authError && <p style={styles.errorText}>{authError}</p>}

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {authMode === "register" && (
              <div style={{ textAlign: "center", marginBottom: "5px" }}>
                <label style={styles.label}>Profile Picture (Optional)</label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "5px" }}>
                  {authAvatar ? <img src={authAvatar} alt="avatar" style={styles.profileAvatarLarge} /> : <div style={styles.profilePlaceholderLarge}>👤</div>}
                  <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setAuthAvatar(base64))} style={{ fontSize: "12px" }} />
                </div>
              </div>
            )}
            <input type="text" placeholder="Username" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} style={styles.inputFull} required />
            <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={styles.inputFull} required />
            <button type="submit" style={styles.primaryBtn}>{authMode === "login" ? "Sign In" : "Register Account"}</button>
          </form>

          <p style={{ fontSize: "13px", marginTop: "15px", textAlign: "center" }}>
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: "#007bff", cursor: "pointer", fontWeight: "bold" }} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
              {authMode === "login" ? "Register" : "Sign In"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  const hackerBloxGroup = groups.find(g => g.name === "Hacker_blox");
  const pinnedGroupsList = groups.filter(g => pinnedGroupIds.includes(g.id) && g.name !== "Hacker_blox");
  const unpinnedGroupsList = groups.filter(g => g.name !== "Hacker_blox" && !pinnedGroupIds.includes(g.id));

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button style={styles.menuBtn} onClick={() => setIsDrawerOpen(true)}>☰</button>
          {currentGroup?.avatar ? <img src={currentGroup.avatar} alt="group" style={styles.headerGroupAvatar} /> : <div style={styles.headerGroupPlaceholder}>#</div>}
          <h3 style={{ margin: 0, display: "flex", alignItems: "center" }}>
            {currentGroup ? currentGroup.name : "Secret-Chat"}
            {currentGroup?.verified && <VerifiedBadge />}
          </h3>
        </div>
        {currentGroup && currentGroup.owner === currentUser.username && (
          <button style={styles.ownerSettingsBtn} onClick={() => { setEditGroupName(currentGroup.name); setEditGroupPassword(""); setEditGroupAvatar(currentGroup.avatar || ""); setEditGroupVerified(currentGroup.verified || false); setView("edit-group"); }}>⚙ Settings</button>
        )}
      </header>

      {/* Drawer */}
      <div style={{ ...styles.drawerOverlay, transform: isDrawerOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={styles.drawerContent}>
          <div style={styles.drawerHeader}>
            <h3>Menu</h3>
            <button style={styles.closeBtn} onClick={() => setIsDrawerOpen(false)}>✕</button>
          </div>

          <div style={styles.drawerProfileSection}>
            <span style={{ fontSize: "11px", color: "#666" }}>Logged in as:</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {currentUser.avatar ? <img src={currentUser.avatar} alt="avatar" style={styles.drawerAvatar} /> : <div style={styles.drawerAvatarPlaceholder}>👤</div>}
                <strong style={{ fontSize: "13px", display: "flex", alignItems: "center" }}>
                  {currentUser.username}
                  {currentUser.verified && <VerifiedBadge />}
                  {currentUser.glowBadge && <GlowBadge />}
                </strong>
              </div>
              <button style={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
            </div>
            <button style={styles.editProfileBtn} onClick={() => { setEditProfileAvatar(currentUser.avatar || ""); setView("edit-profile"); setIsDrawerOpen(false); }}>✏ Change Profile Logo</button>
          </div>

          <div style={styles.drawerActions}>
            <button style={styles.primaryBtn} onClick={() => { setView("create"); setIsDrawerOpen(false); }}>+ Create Group</button>
            <button style={styles.secondaryBtn} onClick={() => { setView("secret-join"); setIsDrawerOpen(false); }}>🔑 Join Secret Group</button>
          </div>

          <hr style={styles.divider} />

          <input type="text" placeholder="Search groups..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.drawerSearchInput} />

          <div style={styles.drawerGroupList}>
            {/* Special Pinned Hacker_blox server */}
            {hackerBloxGroup && (
              <>
                <div style={styles.sectionHeader}>Pinned Servers</div>
                <div 
                  style={{ ...styles.drawerGroupItem, backgroundColor: currentGroup?.id === hackerBloxGroup.id ? "#e2e8f0" : "#fff", border: "1px solid #cbd5e1" }} 
                  onClick={() => handleSelectGroup(hackerBloxGroup)}
                  onContextMenu={(e) => { e.preventDefault(); setGroupContextMenuTarget(hackerBloxGroup); }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => setGroupContextMenuTarget(hackerBloxGroup), 600);
                    e.currentTarget.dataset.holdTimer = timer;
                  }}
                  onTouchEnd={(e) => clearTimeout(e.currentTarget.dataset.holdTimer)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {hackerBloxGroup.avatar ? <img src={hackerBloxGroup.avatar} alt="group" style={styles.listGroupAvatar} /> : <div style={styles.listGroupPlaceholder}>#</div>}
                    <span style={{ display: "flex", alignItems: "center" }}>
                      {hackerBloxGroup.name}
                      {hackerBloxGroup.verified && <VerifiedBadge />}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px" }} title="Special Locked Pin">📌⭐</span>
                </div>
              </>
            )}

            {/* User Pinned Groups */}
            {pinnedGroupsList.length > 0 && pinnedGroupsList.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
              <div style={styles.sectionHeader}>Pinned Groups ({pinnedGroupsList.length}/3)</div>
            )}
            {pinnedGroupsList
              .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(group => (
                <div 
                  key={group.id} 
                  style={{ ...styles.drawerGroupItem, backgroundColor: currentGroup?.id === group.id ? "#e2e8f0" : "#fff" }} 
                  onClick={() => handleSelectGroup(group)}
                  onContextMenu={(e) => { e.preventDefault(); setGroupContextMenuTarget(group); }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => setGroupContextMenuTarget(group), 600);
                    e.currentTarget.dataset.holdTimer = timer;
                  }}
                  onTouchEnd={(e) => clearTimeout(e.currentTarget.dataset.holdTimer)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {group.avatar ? <img src={group.avatar} alt="group" style={styles.listGroupAvatar} /> : <div style={styles.listGroupPlaceholder}>#</div>}
                    <span style={{ display: "flex", alignItems: "center" }}>
                      {group.name}
                      {group.verified && <VerifiedBadge />}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px" }} title="Pinned">📌</span>
                    <span style={{ fontSize: "11px", color: "#666" }}>{group.type === "public" ? "🌐" : "🔒"}</span>
                  </div>
                </div>
              ))}

            {/* Other Groups */}
            <div style={styles.sectionHeader}>All Groups</div>
            {unpinnedGroupsList
              .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(group => (
                <div 
                  key={group.id} 
                  style={{ ...styles.drawerGroupItem, backgroundColor: currentGroup?.id === group.id ? "#e2e8f0" : "#fff" }} 
                  onClick={() => handleSelectGroup(group)}
                  onContextMenu={(e) => { e.preventDefault(); setGroupContextMenuTarget(group); }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => setGroupContextMenuTarget(group), 600);
                    e.currentTarget.dataset.holdTimer = timer;
                  }}
                  onTouchEnd={(e) => clearTimeout(e.currentTarget.dataset.holdTimer)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {group.avatar ? <img src={group.avatar} alt="group" style={styles.listGroupAvatar} /> : <div style={styles.listGroupPlaceholder}>#</div>}
                    <span style={{ display: "flex", alignItems: "center" }}>
                      {group.name}
                      {group.verified && <VerifiedBadge />}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#666" }}>{group.type === "public" ? "🌐" : "🔒"}</span>
                </div>
              ))}
          </div>
        </div>
        <div style={styles.drawerBackdrop} onClick={() => setIsDrawerOpen(false)} />
      </div>

      {/* VIEW: EDIT PROFILE */}
      {view === "edit-profile" && (
        <div style={styles.formContainer}>
          <h3>Change Your Profile Logo</h3>
          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginTop: "10px" }}>
                {editProfileAvatar ? <img src={editProfileAvatar} alt="avatar" style={styles.profileAvatarLarge} /> : <div style={styles.profilePlaceholderLarge}>👤</div>}
                <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setEditProfileAvatar(base64))} style={{ fontSize: "12px" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button type="submit" style={styles.primaryBtn}>Save Logo</button>
              <button type="button" style={styles.cancelBtn} onClick={() => setView("chat")}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: CREATE GROUP */}
      {view === "create" && (
        <div style={styles.formContainer}>
          <h3>Create a Chat Group</h3>
          {createError && <p style={styles.errorText}>{createError}</p>}
          <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={styles.label}>Group Picture (Optional)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                {newGroupAvatar ? <img src={newGroupAvatar} alt="group" style={styles.profileAvatarLarge} /> : <div style={styles.profilePlaceholderLarge}>🖼️</div>}
                <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setNewGroupAvatar(base64))} style={{ fontSize: "12px" }} />
              </div>
            </div>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Unique group name" style={styles.inputFull} required />
            <select value={groupType} onChange={(e) => setGroupType(e.target.value)} style={styles.inputFull}>
              <option value="public">Public</option>
              <option value="private">Private (Password Protected)</option>
            </select>
            {groupType === "private" && (
              <>
                <input type="text" value={groupPassword} onChange={(e) => setGroupPassword(e.target.value)} placeholder="Password / Code" style={styles.inputFull} required />
                <select value={privateVisibility} onChange={(e) => setPrivateVisibility(e.target.value)} style={styles.inputFull}>
                  <option value="visible">Visible in Search</option>
                  <option value="secret">Secret (Hidden, search via code only)</option>
                </select>
              </>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" style={styles.primaryBtn}>Create</button>
              <button type="button" style={styles.cancelBtn} onClick={() => setView("chat")}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: EDIT GROUP */}
      {view === "edit-group" && currentGroup && (
        <div style={styles.formContainer}>
          <h3>Manage Group</h3>
          <form onSubmit={handleUpdateGroup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={styles.label}>Change Group Picture:</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                {editGroupAvatar ? <img src={editGroupAvatar} alt="group" style={styles.profileAvatarLarge} /> : <div style={styles.profilePlaceholderLarge}>🖼</div>}
                <input type="file" accept="image/*" onChange={(e) => handleImageResize(e.target.files[0], (base64) => setEditGroupAvatar(base64))} style={{ fontSize: "12px" }} />
              </div>
            </div>
            <label style={styles.label}>Change Group Name:</label>
            <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} style={styles.inputFull} disabled={currentGroup.name === "Hacker_blox"} />
            <label style={styles.label}>Change Password / Key:</label>
            <input type="text" value={editGroupPassword} onChange={(e) => setEditGroupPassword(e.target.value)} placeholder="New password (leave blank to keep)" style={styles.inputFull} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}>
              <input type="checkbox" id="editVerifiedCheck" checked={editGroupVerified} onChange={(e) => setEditGroupVerified(e.target.checked)} />
              <label htmlFor="editVerifiedCheck" style={{ ...styles.label, display: "inline", cursor: "pointer" }}>Verified Checkmark (✔)</label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button type="submit" style={styles.primaryBtn}>Save Changes</button>
              {currentGroup.name !== "Hacker_blox" && <button type="button" style={styles.deleteBtn} onClick={handleDeleteGroup}>Delete Group</button>}
              <button type="button" style={styles.cancelBtn} onClick={() => setView("chat")}>Back</button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: JOIN SECRET GROUP */}
      {view === "secret-join" && (
        <div style={styles.formContainer}>
          <h3>Access Secret Group</h3>
          {secretSearchError && <p style={styles.errorText}>{secretSearchError}</p>}
          <form onSubmit={handleSearchSecretGroup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="text" value={secretCodeInput} onChange={(e) => setSecretCodeInput(e.target.value)} placeholder="Enter code..." style={styles.inputFull} required />
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" style={styles.primaryBtn}>Access</button>
              <button type="button" style={styles.cancelBtn} onClick={() => setView("chat")}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: CHAT */}
      {view === "chat" && currentGroup && (
        <>
          <div style={styles.chatBox}>
            {messages.map((msg) => {
              const isMe = msg.user === currentUser.username;
              return (
                <div 
                  key={msg.id} 
                  style={{ ...styles.messageRow, justifyContent: isMe ? "flex-end" : "flex-start" }}
                  onContextMenu={(e) => { e.preventDefault(); setSelectedMessageForAction(msg); }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => setSelectedMessageForAction(msg), 600);
                    e.currentTarget.dataset.holdTimer = timer;
                  }}
                  onTouchEnd={(e) => clearTimeout(e.currentTarget.dataset.holdTimer)}
                >
                  {!isMe && (
                    <div style={{ marginRight: "6px", alignSelf: "center" }}>
                      {msg.userAvatar ? <img src={msg.userAvatar} alt="avatar" style={styles.msgAvatar} /> : <div style={styles.msgAvatarPlaceholder}>👤</div>}
                    </div>
                  )}

                  <div style={{ ...styles.messageBubble, backgroundColor: isMe ? "#007bff" : "#e4e6eb", color: isMe ? "#fff" : "#000" }}>
                    <div style={{ ...styles.msgUser, display: "flex", alignItems: "center" }}>
                      {msg.user}
                      {msg.userVerified && <VerifiedBadge />}
                      {msg.userGlowBadge && <GlowBadge />}
                    </div>
                    {msg.text && <div style={{ marginBottom: msg.image ? "6px" : "0", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.text}</div>}
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="uploaded" 
                        style={{ maxWidth: "100%", borderRadius: "8px", maxHeight: "200px", display: "block", cursor: "pointer" }} 
                        onClick={() => { setFullscreenImageSrc(msg.image); setImageZoomScale(1); }}
                      />
                    )}
                  </div>

                  {isMe && (
                    <div style={{ marginLeft: "6px", alignSelf: "center" }}>
                      {msg.userAvatar ? <img src={msg.userAvatar} alt="avatar" style={styles.msgAvatar} /> : <div style={styles.msgAvatarPlaceholder}>👤</div>}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div style={styles.previewContainer}>
              <img src={imagePreview} alt="preview" style={styles.previewImg} />
              <button style={styles.removePreviewBtn} onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>✕</button>
            </div>
          )}

          <form onSubmit={sendMessage} style={styles.form}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => handleChatImageResize(e.target.files[0], (base64) => setImagePreview(base64))} style={{ display: "none" }} />
            <button type="button" style={styles.attachButton} onClick={() => fileInputRef.current?.click()} title="Attach Image">📷</button>
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Message #${currentGroup.name}...`} style={styles.input} />
            <button type="submit" style={styles.sendButton}>Send</button>
          </form>
        </>
      )}

      {/* GROUP LONG PRESS CONTEXT MENU MODAL */}
      {groupContextMenuTarget && (
        <div style={styles.modalOverlay} onClick={() => setGroupContextMenuTarget(null)}>
          <div style={styles.contextMenuContent} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", borderBottom: "1px solid #eee", paddingBottom: "6px" }}>{groupContextMenuTarget.name}</h4>
            <button style={styles.contextMenuBtn} onClick={() => handleTogglePinFromContext(groupContextMenuTarget)}>
              {groupContextMenuTarget.name === "Hacker_blox" ? "📌 Hacker_blox (Permanently Pinned)" : pinnedGroupIds.includes(groupContextMenuTarget.id) ? "📌 Unpin Group" : "📌 Pin Group"}
            </button>
            <button style={styles.contextMenuBtn} onClick={() => handleOpenInfoFromContext(groupContextMenuTarget)}>ℹ️ Info</button>
            
            {currentUser.username === "Bloxypro_18" && (
              <button style={{ ...styles.contextMenuBtn, color: "#0095f6" }} onClick={() => handleToggleVerification(groupContextMenuTarget, "group")}>
                {groupContextMenuTarget.verified ? "❌ Remove Group Checkmark" : "✔ Verify Group Checkmark"}
              </button>
            )}

            <button style={{ ...styles.contextMenuBtn, color: "#666" }} onClick={() => setGroupContextMenuTarget(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* GROUP INFO MODAL */}
      {groupInfoTarget && (
        <div style={styles.modalOverlay} onClick={() => setGroupInfoTarget(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              {groupInfoTarget.avatar ? <img src={groupInfoTarget.avatar} alt="group" style={styles.profileAvatarLarge} /> : <div style={{ ...styles.profilePlaceholderLarge, margin: "0 auto" }}>#</div>}
              <h3 style={{ margin: "8px 0 2px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {groupInfoTarget.name}
                {groupInfoTarget.verified && <VerifiedBadge />}
              </h3>
              <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase" }}>{groupInfoTarget.type} group</span>
            </div>
            <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px", backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "6px" }}>
              <div><strong>Creator (Owner):</strong> {groupInfoTarget.owner || "Unknown"}</div>
              <div><strong>Created At:</strong> {groupInfoTarget.createdAt ? new Date(groupInfoTarget.createdAt.toMillis()).toLocaleString() : "Recently"}</div>
              <div><strong>Online Members ({onlineMembers.length}):</strong> {onlineMembers.join(", ") || "None"}</div>
            </div>
            <div style={{ textAlign: "right", marginTop: "15px" }}>
              <button style={styles.primaryBtn} onClick={() => setGroupInfoTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGE ACTION MODAL */}
      {selectedMessageForAction && (
        <div style={styles.modalOverlay} onClick={() => setSelectedMessageForAction(null)}>
          <div style={styles.contextMenuContent} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", borderBottom: "1px solid #eee", paddingBottom: "6px" }}>Message Options</h4>
            {selectedMessageForAction.user === currentUser.username && (
              <button style={{ ...styles.contextMenuBtn, color: "#dc3545" }} onClick={() => handleDeleteForEveryone(selectedMessageForAction.id)}>Delete for everyone</button>
            )}
            <button style={styles.contextMenuBtn} onClick={() => handleDeleteForMe(selectedMessageForAction.id)}>Delete for me</button>

            {currentUser.username === "Bloxypro_18" && (
              <button style={{ ...styles.contextMenuBtn, color: "#0095f6" }} onClick={() => handleToggleVerification(selectedMessageForAction.user, "user")}>
                Toggle Verify User (@{selectedMessageForAction.user})
              </button>
            )}

            <button style={{ ...styles.contextMenuBtn, color: "#666" }} onClick={() => setSelectedMessageForAction(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* IN-APP FULLSCREEN IMAGE ZOOM PREVIEW */}
      {fullscreenImageSrc && (
        <div style={styles.fullscreenOverlay} onClick={() => setFullscreenImageSrc(null)}>
          <button style={styles.closeFullscreenBtn} onClick={() => setFullscreenImageSrc(null)}>✕</button>
          <div style={styles.zoomControls}>
            <button style={styles.zoomBtn} onClick={(e) => { e.stopPropagation(); setImageZoomScale(prev => Math.max(prev - 0.25, 0.5)); }}>-</button>
            <span style={{ color: "#fff", fontSize: "12px", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "4px" }}>{Math.round(imageZoomScale * 100)}%</span>
            <button style={styles.zoomBtn} onClick={(e) => { e.stopPropagation(); setImageZoomScale(prev => Math.min(prev + 0.25, 4)); }}>+</button>
          </div>
          <div style={styles.fullscreenImgContainer} onClick={(e) => e.stopPropagation()}>
            <img src={fullscreenImageSrc} alt="zoom preview" style={{ ...styles.fullscreenImg, transform: `scale(${imageZoomScale})` }} />
          </div>
        </div>
      )}

      {selectedGroupToJoin && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Password Required</h3>
            {joinError && <p style={styles.errorText}>{joinError}</p>}
            <form onSubmit={handleVerifyJoinPassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="password" value={joinPasswordInput} onChange={(e) => setJoinPasswordInput(e.target.value)} placeholder="Enter password" style={styles.inputFull} autoFocus required />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" style={styles.cancelBtn} onClick={() => setSelectedGroupToJoin(null)}>Cancel</button>
                <button type="submit" style={styles.primaryBtn}>Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100vh", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#f9f9f9", position: "relative", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" },
  authContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f0f2f5" },
  authBox: { backgroundColor: "#fff", padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "350px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  
  header: { padding: "10px 15px", backgroundColor: "#fff", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" },
  menuBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer" },
  ownerSettingsBtn: { fontSize: "12px", padding: "6px 10px", backgroundColor: "#f1f2f6", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer" },
  
  headerGroupAvatar: { width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" },
  headerGroupPlaceholder: { width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color: "#555" },

  drawerOverlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", zIndex: 1000, transition: "transform 0.3s ease" },
  drawerContent: { width: "75%", maxWidth: "280px", backgroundColor: "#fff", height: "100%", padding: "15px", display: "flex", flexDirection: "column", boxShadow: "2px 0 8px rgba(0,0,0,0.2)", zIndex: 1001, boxSizing: "border-box" },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  closeBtn: { background: "none", border: "none", fontSize: "16px", cursor: "pointer" },
  drawerProfileSection: { backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "8px" },
  drawerAvatar: { width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" },
  drawerAvatarPlaceholder: { width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  signOutBtn: { fontSize: "11px", padding: "4px 8px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  editProfileBtn: { fontSize: "11px", padding: "6px", backgroundColor: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", textAlign: "center" },
  
  drawerActions: { display: "flex", flexDirection: "column", gap: "8px" },
  drawerSearchInput: { width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", outline: "none", fontSize: "13px", boxSizing: "border-box", userSelect: "text", WebkitUserSelect: "text" },
  drawerGroupList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" },
  sectionHeader: { fontSize: "10px", fontWeight: "bold", color: "#888", textTransform: "uppercase", marginTop: "10px", marginBottom: "4px", letterSpacing: "0.5px" },
  drawerGroupItem: { padding: "8px 10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: "1px solid #eee" },
  listGroupAvatar: { width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" },
  listGroupPlaceholder: { width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold" },

  primaryBtn: { padding: "10px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" },
  secondaryBtn: { padding: "10px", backgroundColor: "#6c757d", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" },
  cancelBtn: { padding: "8px 12px", backgroundColor: "#ccc", border: "none", borderRadius: "6px", cursor: "pointer" },
  deleteBtn: { padding: "8px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" },
  
  divider: { border: "0", borderTop: "1px solid #ddd", margin: "15px 0" },
  input: { flex: 1, padding: "8px 12px", borderRadius: "20px", border: "1px solid #ccc", outline: "none", fontSize: "13px", boxSizing: "border-box", userSelect: "text", WebkitUserSelect: "text" },
  inputFull: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", outline: "none", fontSize: "14px", boxSizing: "border-box", userSelect: "text", WebkitUserSelect: "text" },
  label: { fontSize: "12px", fontWeight: "bold", color: "#444", display: "block", marginBottom: "4px" },

  profileAvatarLarge: { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" },
  profilePlaceholderLarge: { width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },

  formContainer: { padding: "20px", flex: 1, backgroundColor: "#fff", margin: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", zIndex: 10, position: "absolute", width: "calc(100% - 40px)", boxSizing: "border-box" },
  errorText: { color: "#dc3545", fontSize: "12px", marginBottom: "10px" },

  chatBox: { flex: 1, padding: "15px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" },
  messageRow: { display: "flex", width: "100%", alignItems: "center" },
  msgAvatar: { width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" },
  msgAvatarPlaceholder: { width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" },
  messageBubble: { maxWidth: "70%", padding: "10px 14px", borderRadius: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
  msgUser: { fontSize: "11px", opacity: 0.9, marginBottom: "3px", fontWeight: "bold" },
  
  form: { display: "flex", padding: "10px 15px", backgroundColor: "#fff", borderTop: "1px solid #ddd", alignItems: "center", gap: "8px" },
  attachButton: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "0 4px" },
  sendButton: { padding: "8px 16px", borderRadius: "20px", border: "none", backgroundColor: "#007bff", color: "#fff", fontWeight: "bold", cursor: "pointer" },

  previewContainer: { padding: "8px 15px", backgroundColor: "#f1f2f6", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid #ddd", position: "relative" },
  previewImg: { height: "50px", borderRadius: "4px" },
  removePreviewBtn: { background: "#dc3545", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  modalContent: { backgroundColor: "#fff", padding: "20px", borderRadius: "8px", width: "85%", maxWidth: "320px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)" },
  
  contextMenuContent: { backgroundColor: "#fff", padding: "15px", borderRadius: "8px", width: "80%", maxWidth: "260px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: "8px" },
  contextMenuBtn: { padding: "10px", backgroundColor: "#f1f2f6", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", textAlign: "left" },

  fullscreenOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, overflow: "hidden" },
  fullscreenImgContainer: { width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", overflow: "auto" },
  fullscreenImg: { maxWidth: "90%", maxHeight: "90%", objectFit: "contain", transition: "transform 0.2s ease" },
  closeFullscreenBtn: { position: "absolute", top: "15px", right: "20px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: "50%", width: "36px", height: "36px", fontSize: "16px", cursor: "pointer", zIndex: 3002 },
  zoomControls: { position: "absolute", bottom: "20px", display: "flex", gap: "10px", alignItems: "center", zIndex: 3002 },
  zoomBtn: { width: "36px", height: "36px", borderRadius: "50%", background: "#fff", border: "none", fontSize: "18px", fontWeight: "bold", cursor: "pointer" },

  glowBadgeStyle: {
    marginLeft: "4px",
    verticalAlign: "middle",
    display: "inline-block",
    filter: "drop-shadow(0 0 4px #00ff66) drop-shadow(0 0 8px #ffffff)",
    fontSize: "12px",
    userSelect: "none",
    WebkitUserSelect: "none"
  },

  verifiedBadgeStyle: {
    width: "14px",
    height: "14px",
    verticalAlign: "middle",
    marginLeft: "4px",
    userSelect: "none",
    WebkitUserSelect: "none",
    filter: "drop-shadow(0 0 3px #00ff66) drop-shadow(0 0 7px #ffffff)"
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ChatApp />);
