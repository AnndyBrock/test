import { useContext, useEffect, useRef, useState } from "react";
import "./chat.scss";
import { AuthContext } from "../../context/AuthContext";
import { format } from "timeago.js";
import { SocketContext } from "../../context/SocketContext";
import requestAPI from "../../lib/request.js";

function Chat({ chats }) {
    const [chat, setChat] = useState(null);
    const { user } = useContext(AuthContext);
    const { socket } = useContext(SocketContext);
    const messageEndRef = useRef();

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    const handleOpenChat = async (id, receiver) => {
        try {
            const res = await requestAPI("/chats/" + id);
            if (!res.data.seenBy.includes(user.id)) {
                socket.emit("markAsRead", id); // Отправляем событие на сервер
            }
            setChat({ ...res.data, receiver });
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const text = formData.get("text");

        if (!text) return;
        try {
            const res = await requestAPI.post("/messages/" + chat.id, { text });
            setChat((prev) => ({ ...prev, messages: [...prev.messages, res.data] }));
            e.target.reset();
            socket.emit("sendMessage", {
                receiverId: chat.receiver.id,
                chatId: chat.id,
                data: res.data,
            });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (chat && socket) {
            socket.on("getMessage", (data) => {
                if (chat.id === data.chatId) {
                    setChat((prev) => ({ ...prev, messages: [...prev.messages, data] }));
                }
            });
        }

        return () => {
            if (socket) {
                socket.off("getMessage");
            }
        };
    }, [socket, chat]);

    return (
        <div className="chat">
            <div className="messages">
                <h1>Messages</h1>
                {chats?.map((c) => (
                    <div
                        className="message"
                        key={c.id}
                        style={{
                            backgroundColor:
                                c.seenBy.includes(user.id) || chat?.id === c.id
                                    ? "white"
                                    : "#fecd514e",
                        }}
                        onClick={() => handleOpenChat(c.id, c.receiver)}
                    >
                        <img src={c.receiver.avatar || "/noavatar.jpg"} alt="" />
                        <span>{c.receiver.username}</span>
                        <p>{c.lastMessage}</p>
                    </div>
                ))}
            </div>
            {chat && (
                <div className="chatBox">
                    <div className="top">
                        <div className="user">
                            <img src={chat.receiver.avatar || "noavatar.jpg"} alt="" />
                            {chat.receiver.username}
                        </div>
                        <span className="close" onClick={() => setChat(null)}>
                            X
                        </span>
                    </div>
                    <div className="center">
                        {chat.messages.map((message) => (
                            <div
                                className="chatMessage"
                                style={{
                                    alignSelf:
                                        message.userId === user.id
                                            ? "flex-end"
                                            : "flex-start",
                                    textAlign:
                                        message.userId === user.id ? "right" : "left",
                                }}
                                key={message.id}
                            >
                                <p>{message.text}</p>
                                <span>{format(message.createdAt)}</span>
                            </div>
                        ))}
                        <div ref={messageEndRef}></div>
                    </div>
                    <form onSubmit={handleSubmit} className="bottom">
                        <textarea name="text"></textarea>
                        <button>Send</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Chat;
