const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function runTests() {
    try {
        console.log('--- Starting RBAC Tests ---');

        // 1. Create User
        console.log('\n1. Creating User...');
        let userId;
        try {
            const userRes = await axios.post(`${BASE_URL}/users/add-new`, {
                username: `rbacuser${Date.now()}`,
                firstName: 'Rbac',
                lastName: 'Tester',
                gender: 'male',
                email: `rbac.test.${Date.now()}@example.com`,
                password: 'Password123',
                fin: `FIN${Date.now().toString().slice(-7)}`
            });
            userId = userRes.data.data._id;
            console.log('User created:', userId);
        } catch (error) {
            console.error('Error creating user:', error.response?.data || error.message);
            return;
        }

        // 2. Create Permission
        console.log('\n2. Creating Permission...');
        let permissionId;
        const permSlug = `create-user-${Date.now()}`;
        try {
            const permRes = await axios.post(`${BASE_URL}/rbac/permissions`, {
                name: `Create User ${Date.now()}`,
                slug: permSlug,
                description: 'Permission to create users'
            });
            permissionId = permRes.data.data._id;
            console.log('Permission created:', permissionId);
        } catch (error) {
            console.error('Error creating permission:', error.response?.data || error.message);
            return;
        }

        // 3. Create Role
        console.log('\n3. Creating Role...');
        let roleId;
        const roleName = `Admin-${Date.now()}`;
        try {
            const roleRes = await axios.post(`${BASE_URL}/rbac/roles`, {
                name: roleName,
                description: 'Admin role'
            });
            roleId = roleRes.data.data._id;
            console.log('Role created:', roleId);
        } catch (error) {
            console.error('Error creating role:', error.response?.data || error.message);
            return;
        }

        // 4. Assign Permission to Role
        console.log('\n4. Assigning Permission to Role...');
        try {
            const assignPermRes = await axios.post(`${BASE_URL}/rbac/roles/${roleId}/permissions`, {
                permissions: [permissionId]
            });
            console.log('Permission assigned to role:', assignPermRes.data.message);
        } catch (error) {
            console.error('Error assigning permission:', error.response?.data || error.message);
            return;
        }

        // 5. Assign Role to User
        console.log('\n5. Assigning Role to User...');
        try {
            const assignRoleRes = await axios.post(`${BASE_URL}/rbac/assign-role`, {
                userId: userId,
                roleId: roleId
            });
            console.log('Role assigned to user:', assignRoleRes.data.message);
            console.log('Updated User Role:', assignRoleRes.data.data.role);
        } catch (error) {
            console.error('Error assigning role:', error.response?.data || error.message);
            return;
        }

        console.log('\n--- RBAC Tests Completed Successfully ---');

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

runTests();
