import * as Loader from "./loader";
import * as DB from "./db";
import * as Notifications from "./notifications";
import * as Settings from "./settings";
import * as Config from "./config";
import axiosInstance from "./axios-instance";
import { config } from "dotenv";

export function show(action, id, name) {
  if (action === "add") {
    $("#presetWrapper #presetEdit").attr("action", "add");
    $("#presetWrapper #presetEdit .title").html("Create new preset");
    $("#presetWrapper #presetEdit .button").html(`<i class="fas fa-plus"></i>`);
    $("#presetWrapper #presetEdit input.text").val("");
    $("#presetWrapper #presetEdit input.text").removeClass("hidden");
    $("#presetWrapper #presetEdit label").addClass("hidden");
  } else if (action === "edit") {
    $("#presetWrapper #presetEdit").attr("action", "edit");
    $("#presetWrapper #presetEdit").attr("presetid", id);
    $("#presetWrapper #presetEdit .title").html("Edit preset");
    $("#presetWrapper #presetEdit .button").html(`<i class="fas fa-pen"></i>`);
    $("#presetWrapper #presetEdit input.text").val(name);
    $("#presetWrapper #presetEdit input.text").removeClass("hidden");
    $("#presetWrapper #presetEdit label input").prop("checked", false);
    $("#presetWrapper #presetEdit label").removeClass("hidden");
  } else if (action === "remove") {
    $("#presetWrapper #presetEdit").attr("action", "remove");
    $("#presetWrapper #presetEdit").attr("presetid", id);
    $("#presetWrapper #presetEdit .title").html("Remove preset " + name);
    $("#presetWrapper #presetEdit .button").html(
      `<i class="fas fa-check"></i>`
    );
    $("#presetWrapper #presetEdit input.text").addClass("hidden");
    $("#presetWrapper #presetEdit label").addClass("hidden");
  }

  if ($("#presetWrapper").hasClass("hidden")) {
    $("#presetWrapper")
      .stop(true, true)
      .css("opacity", 0)
      .removeClass("hidden")
      .animate({ opacity: 1 }, 100, () => {
        $("#presetWrapper #presetEdit input").focus();
      });
  }
}

function hide() {
  if (!$("#presetWrapper").hasClass("hidden")) {
    $("#presetWrapper #presetEdit").attr("action", "");
    $("#presetWrapper #presetEdit").attr("tagid", "");
    $("#presetWrapper")
      .stop(true, true)
      .css("opacity", 1)
      .animate(
        {
          opacity: 0,
        },
        100,
        () => {
          $("#presetWrapper").addClass("hidden");
        }
      );
  }
}

async function apply() {
  let action = $("#presetWrapper #presetEdit").attr("action");
  let inputVal = $("#presetWrapper #presetEdit input").val();
  let presetid = $("#presetWrapper #presetEdit").attr("presetid");

  let updateConfig = $("#presetWrapper #presetEdit label input").prop(
    "checked"
  );
  let configChanges = null;
  if ((updateConfig && action === "edit") || action === "add") {
    configChanges = Config.getConfigChanges();
    let activeTagIds = [];
    DB.getSnapshot().tags.forEach((tag) => {
      if (tag.active) {
        activeTagIds.push(tag._id);
      }
    });
    configChanges.tags = activeTagIds;
  }

  hide();
  if (action === "add") {
    Loader.show();
    let response;
    try {
      response = await axiosInstance.post("/presets/add", {
        name: inputVal,
        config: configChanges,
      });
    } catch (e) {
      Loader.hide();
      let msg = e?.response?.data?.message ?? e.message;
      Notifications.add("Failed to add preset: " + msg, -1);
      return;
    }
    Loader.hide();
    if (response.status !== 200) {
      Notifications.add(response.data.message);
    } else {
      Notifications.add("Preset added", 1, 2);
      DB.getSnapshot().presets.push({
        name: inputVal,
        config: configChanges,
        _id: response.data.insertedId,
      });
      Settings.update();
    }
  } else if (action === "edit") {
    Loader.show();
    let response;
    try {
      response = await axiosInstance.post("/presets/edit", {
        name: inputVal,
        _id: presetid,
        config: updateConfig === true ? configChanges : null,
      });
    } catch (e) {
      Loader.hide();
      let msg = e?.response?.data?.message ?? e.message;
      Notifications.add("Failed to edit preset: " + msg, -1);
      return;
    }
    Loader.hide();
    if (response.status !== 200) {
      Notifications.add(response.data.message);
    } else {
      Notifications.add("Preset updated", 1);
      let preset = DB.getSnapshot().presets.filter(
        (preset) => preset._id == presetid
      )[0];
      preset.name = inputVal;
      if (updateConfig === true) preset.config = configChanges;
      Settings.update();
    }
  } else if (action === "remove") {
    Loader.show();
    let response;
    try {
      response = await axiosInstance.post("/presets/remove", {
        _id: presetid,
      });
    } catch (e) {
      Loader.hide();
      let msg = e?.response?.data?.message ?? e.message;
      Notifications.add("Failed to remove preset: " + msg, -1);
      return;
    }
    Loader.hide();
    if (response.status !== 200) {
      Notifications.add(response.data.message);
    } else {
      Notifications.add("Preset removed", 1);
      DB.getSnapshot().presets.forEach((preset, index) => {
        if (preset._id === presetid) {
          DB.getSnapshot().presets.splice(index, 1);
        }
      });
      Settings.update();
    }
  }
}

$("#presetWrapper").click((e) => {
  if ($(e.target).attr("id") === "presetWrapper") {
    hide();
  }
});

$("#presetWrapper #presetEdit .button").click(() => {
  apply();
});

$("#presetWrapper #presetEdit input").keypress((e) => {
  if (e.keyCode == 13) {
    apply();
  }
});
