const GET_UNKNOWN_USER = "Этот пользователь не взаимодействовал ранее с ботом";
const GET_CANNOT_DETERMINE_USER = "Не удалось определить пользователя.";
const GET_NO_AVATARS = "У пользователя нет аватарок или они недоступны.";

function getCommandArguments(ctx) {
  const text = ctx.message && ctx.message.text ? ctx.message.text : "";
  return text.split(" ").slice(1).filter(Boolean);
}

async function findChatByIdOrUsername(telegram, value) {
  let target = value;
  if (/^-?\d+$/.test(target)) {
    const id = Number(target);
    return telegram.getChat(id);
  }
  if (!target.startsWith("@")) {
    target = "@" + target;
  }
  return telegram.getChat(target);
}

function getCommands(bot) {
  bot.command("user", async (ctx) => {
    const args = getCommandArguments(ctx);
    const arg = args[0];
    try {
      let chat;

      if (!arg) {
        const targetId = ctx.from && ctx.from.id;
        if (!targetId) {
          return ctx.reply(GET_CANNOT_DETERMINE_USER);
        }
        chat = await ctx.telegram.getChat(targetId);
      } else {
        chat = await findChatByIdOrUsername(ctx.telegram, arg);
      }
      const name = chat.first_name || chat.last_name || chat.title || "";
      const displayName = name && name.trim().length > 0 ? name : "Неизвестное имя";
      return ctx.reply(`Имя: ${displayName}\nID: ${chat.id}`);
    } catch (e) {
      const text = (e && (e.description || e.message || "")).toString().toLowerCase();
      if (text.includes("chat not found") || text.includes("user not found")) {
        return ctx.reply(GET_UNKNOWN_USER);
      }
      return ctx.reply(
        `Не удалось получить данные пользователя: ${e && (e.description || e.message) || "Неизвестная ошибка"}`
      );
    }
  });

  bot.command("avatar", async (ctx) => {
    const args = getCommandArguments(ctx);
    const arg = args[0];
    try {
      let chat;
      if (!arg) {
        const targetId = ctx.from && ctx.from.id;
        if (!targetId) {
          return ctx.reply(GET_CANNOT_DETERMINE_USER);
        }
        chat = await ctx.telegram.getChat(targetId);
      } else {
        chat = await findChatByIdOrUsername(ctx.telegram, arg);
      }
      const userId = chat.id;
      const photos = await ctx.telegram.getUserProfilePhotos(userId, { limit: 100 });
      if (!photos.total_count || !photos.photos || !photos.photos.length) {
        return ctx.reply(GET_NO_AVATARS);
      }
      const biggestFiles = photos.photos
        .map((sizes) => (sizes && sizes.length ? sizes[sizes.length - 1].file_id : null))
        .filter(Boolean);
      if (!biggestFiles.length) {
        return ctx.reply(GET_NO_AVATARS);
      }
      const chunkSize = 10;
      for (let i = 0; i < biggestFiles.length; i += chunkSize) {
        const chunk = biggestFiles.slice(i, i + chunkSize);
        const media = chunk.map((fileId) => ({
          type: "photo",
          media: fileId
        }));
        await ctx.replyWithMediaGroup(media);
      }
    } catch (e) {
      const text = (e && (e.description || e.message || "")).toString().toLowerCase();
      if (text.includes("chat not found") || text.includes("user not found")) {
        return ctx.reply(GET_UNKNOWN_USER);
      }
      return ctx.reply(
        `Не удалось получить аватарки пользователя: ${e && (e.description || e.message) || "Неизвестная ошибка"}`
      );
    }
  });

  bot.command("debug_user", async (ctx) => {
    const args = getCommandArguments(ctx);
    const arg = args[0];
    try {
      let chat;
      if (!arg) {
        const targetId = ctx.from && ctx.from.id;
        if (!targetId) {
          return ctx.reply(GET_CANNOT_DETERMINE_USER);
        }
        chat = await ctx.telegram.getChat(targetId);
      } else {
        chat = await findChatByIdOrUsername(ctx.telegram, arg);
      }
      const json = JSON.stringify(chat, null, 2);
      const chunkSize = 3500;
      for (let i = 0; i < json.length; i += chunkSize) {
        const chunk = json.slice(i, i + chunkSize);
        await ctx.reply("```json\n" + chunk + "\n```", {
          parse_mode: "Markdown"
        });
      }
    } catch (e) {
      const text = (e && (e.description || e.message || "")).toString().toLowerCase();
      if (text.includes("chat not found") || text.includes("user not found")) {
        return ctx.reply(GET_UNKNOWN_USER);
      }
      return ctx.reply(
        `Не удалось получить отладочную информацию пользователя: ${
          e && (e.description || e.message) || "Неизвестная ошибка"
        }`
      );
    }
  });
}

module.exports = getCommands;
