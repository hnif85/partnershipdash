import { getCustomerById } from './lib/cmsCustomers.ts';

async function checkUser() {
  try {
    // Check by username
    console.log('Checking by username: wheeinthemd2');
    const userByUsername = await getCustomerById('wheeinthemd2');
    if (userByUsername) {
      console.log('✅ User found by username:');
      console.log(JSON.stringify(userByUsername, null, 2));
      return;
    }

    // Check by email
    console.log('Checking by email: wheeinthemood23@gmail.com');
    const userByEmail = await getCustomerById('wheeinthemood23@gmail.com');
    if (userByEmail) {
      console.log('✅ User found by email:');
      console.log(JSON.stringify(userByEmail, null, 2));
      return;
    }

    console.log('❌ User not found in database');
  } catch (error) {
    console.error('❌ Error checking user:', error);
  }
}

checkUser();
