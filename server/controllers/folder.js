const Folder = require("../models/Folder");
const Server = require("../models/Server");

module.exports.createFolder = async (accountId, configuration) => {
    if (configuration.parentId) {
        const parentFolder = await Folder.findByPk(configuration.parentId);
        if (parentFolder === null) {
            return { code: 302, message: "Parent folder does not exist" };
        }
    }

    const folder = await Folder.create({
        name: configuration.name, accountId: accountId,
        parentId: configuration.parentId,
    });

    return folder;
};

module.exports.deleteFolder = async (accountId, folderId) => {
    const folder = await Folder.findOne({ where: { accountId: accountId, id: folderId } });

    if (folder === null) {
        return { code: 301, message: "Folder does not exist" };
    }

    let subfolders = await Folder.findAll({ where: { parentId: folderId } });
    for (let subfolder of subfolders) {
        await module.exports.deleteFolder(accountId, subfolder.id);
    }

    await Server.destroy({ where: { folderId: folderId } });

    await Folder.destroy({ where: { id: folderId } });
};

module.exports.editFolder = async (accountId, folderId, configuration) => {
    const folder = await Folder.findOne({ where: { accountId: accountId, id: folderId } });

    if (folder === null) {
        return { code: 301, message: "Folder does not exist" };
    }

    if (configuration.parentId) {
        let folder = await Folder.findOne({ where: { id: configuration.parentId, accountId: accountId } });
        while (folder) {
            if (folder.id === parseInt(folderId)) {
                return { code: 303, message: "Cannot move folder to its own subfolder" };
            }
            if (folder.parentId === null) {
                break;
            }
            folder = await Folder.findOne({ where: { id: folder.parentId, accountId: accountId } });
        }
    }


    await Folder.update(configuration, { where: { id: folderId } });
};

module.exports.listFolders = async (accountId, showFolderType = false) => {
    const folders = await Folder.findAll({
        where: {
            accountId: accountId,
        },
        order: [
            ["parentId", "ASC"],
            ["position", "ASC"],
        ],
    });

    const folderMap = new Map();
    let newFolders = [];

    folders.forEach(folder => {
        folderMap.set(folder.id, {
            id: folder.id,
            name: folder.name,
            type: showFolderType ? "folder" : undefined,
            position: folder.position,
            entries: [],
        });
    });

    folders.forEach(folder => {
        if (folder.parentId) {
            const parentFolder = folderMap.get(folder.parentId);
            if (parentFolder) {
                parentFolder.entries.push(folderMap.get(folder.id));
            }
        } else {
            newFolders.push(folderMap.get(folder.id));
        }
    });

    return newFolders;
};
