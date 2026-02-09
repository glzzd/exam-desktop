const express = require('express');
const router = express.Router();

const rbacController = require('../../controllers/rbacController');


// İcazələr (Permissions)
router.post('/permissions', rbacController.createPermission);
router.get('/permissions', rbacController.getPermissions);
router.get('/permissions/:id', rbacController.getPermissionById);
router.delete('/permissions/:id', rbacController.deletePermission);

// Rollar (Roles)
router.post('/roles/add-new', rbacController.createRole);
router.get('/roles', rbacController.getRoles);
router.get('/roles/:id', rbacController.getRoleById);
router.put('/roles/:id', rbacController.updateRole);
router.delete('/roles/:id', rbacController.deleteRole);
router.post('/roles/:roleId/add-permission', rbacController.assignPermissionsToRole);

// İstifadəçi-Rol əlaqəsi
router.post('/assign-role', rbacController.assignRoleToUser);

module.exports = router;
