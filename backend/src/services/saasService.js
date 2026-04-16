import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const signup = async (data) => {
  const {
    organizationName,
    ownerName,
    ownerEmail,
    ownerPassword,
    companyPhone
  } = data;

  // 🔐 Hash password
  const hashedPassword = await bcrypt.hash(ownerPassword, 10);

  // ✅ 1. Create User first
  const user = await User.create({
    name: ownerName,
    email: ownerEmail,
    password: hashedPassword,
    role: "admin"
  });

  // ✅ 2. Create Organization with owner ID
  const organization = await Organization.create({
    name: organizationName,
    email: ownerEmail,
    phone: companyPhone,
    owner: user._id   // 🔥 THIS FIXES YOUR ERROR
  });

  // 🔗 Optional: link user to org
  user.organizationId = organization._id;
  await user.save();

  // 🔐 Generate token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user,
    organization
  };
};