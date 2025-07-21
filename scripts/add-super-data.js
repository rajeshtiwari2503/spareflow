// const { PrismaClient } = require('@prisma/client');

// const prisma=new PrismaClient();
// async function main(){ 
//     const createUser =await prisma.user.create({
//     data:{
//         name:"Lalit Chauhan",
//         email:"zumffer@gmail.com",
//         password:"Zumffer@1",
//         role:"SUPER_ADMIN",
//     }
// });
// console.log(createUser,"createUser");

// }
// main()

// prisma-update-user.ts
// import { PrismaClient } from '@prisma/client';
 

// scripts/updateUser.ts (or inside an API route if preferred)
// import { PrismaClient } from '@prisma/client';
  
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');


const prisma = new PrismaClient();

async function main() {
  const userId = 'cmda5pr4a0000gie6lu083bnh';

  // Define hashPassword directly inside the function
  async function hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  const hashedPassword = await hashPassword("Zumffer@1");

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name: "Lalit Chauhan",
      email: "zumffer@gmail.com",
      password: hashedPassword,
    },
  });

  console.log("User updated:", updatedUser);
}

main()
  .catch((e) => {
    console.error("Update Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
