import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Vendor from "@/models/Vendor";
import TeamMember from "@/models/TeamMember";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/password-validation";
import {
  generateVerificationToken,
  generateTokenExpiry,
} from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { email, password, name, accountType, membershipPlan, inviteToken } =
      body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "Password does not meet security requirements",
          details: passwordValidation.errors,
        },
        { status: 400 },
      );
    }

    // Check if this is an invitation signup
    let invitation = null;

    if (inviteToken) {
      invitation = await TeamMember.findOne({
        inviteToken,
        email,
        status: "pending",
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Invalid or expired invitation" },
          { status: 400 },
        );
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    // If user exists and this is NOT an invitation, return error
    if (existingUser && !invitation) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    // If user exists and this IS an invitation, check if they were a removed team member
    if (existingUser && invitation) {
      // Update existing user to reactivate them
      existingUser.adminId = invitation.adminId;
      existingUser.permissions = invitation.permissions || {};
      existingUser.role = "team_member";
      existingUser.isActive = true;
      await existingUser.save();

      // Activate the invitation
      invitation.status = "active";
      invitation.acceptedAt = new Date();
      await invitation.save();

      return NextResponse.json(
        {
          message: "Account reactivated successfully",
          user: {
            id: existingUser._id,
            email: existingUser.email,
            name: existingUser.name,
            accountType: existingUser.accountType,
            role: existingUser.role,
            membershipPlan: existingUser.membershipPlan,
          },
        },
        { status: 201 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine if this is a public vendor signup
    const isPublicVendor = !invitation && accountType === "public_vendor";

    // Determine plan approval status
    let planApprovalStatus = "approved"; // Default for personal plan
    let maxStores = 1; // Default for personal plan
    let userIsActive = true; // Default active

    if (membershipPlan === "enterprise") {
      planApprovalStatus = "pending"; // Enterprise plans need approval
      maxStores = 5;
      userIsActive = false; // Inactive until approved
    } else if (membershipPlan === "premium") {
      // Premium plan should not be selectable in signup, but if somehow sent:
      return NextResponse.json(
        {
          error:
            "Premium plan requires manual consultation. Please contact us for pricing.",
        },
        { status: 400 },
      );
    } else if (membershipPlan === "personal") {
      planApprovalStatus = "approved"; // Personal is auto-approved
      maxStores = 1;
      userIsActive = true;
    }

    // Public vendors override the plan logic
    if (isPublicVendor) {
      userIsActive = false; // Public vendors start inactive
      planApprovalStatus = "approved"; // They use vendorApprovalStatus instead
    }

    console.log("=== SIGNUP DEBUG ===");
    console.log("Account Type:", accountType);
    console.log("Is Public Vendor:", isPublicVendor);
    console.log("Has Invitation:", !!invitation);
    console.log("Membership Plan:", membershipPlan);
    console.log("Plan Approval Status:", planApprovalStatus);
    console.log("Max Stores:", maxStores);
    console.log("User Is Active:", userIsActive);
    console.log("==================");

    // Generate email verification token for non-invited users
    let verificationToken = null;
    let verificationTokenExpiry = null;

    if (!invitation) {
      verificationToken = generateVerificationToken();
      verificationTokenExpiry = generateTokenExpiry();
    }

    // Create user account
    const userData = {
      email,
      password: hashedPassword,
      name,
      // Email verification fields (only for non-invited users)
      isEmailVerified: invitation ? true : false, // Team invitations are pre-verified
      emailVerificationToken: invitation ? null : verificationToken,
      emailVerificationTokenExpiry: invitation ? null : verificationTokenExpiry,
      emailVerificationTokenUsed: false,
      accountType: invitation ? "user" : accountType || "user",
      role: invitation
        ? "team_member"
        : isPublicVendor
          ? "public_vendor"
          : "owner",
      membershipPlan: invitation ? "invited" : membershipPlan || "personal",
      planApprovalStatus: invitation ? "approved" : planApprovalStatus,
      maxStores: invitation ? 1 : maxStores,
      membershipStart: new Date(),
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: invitation ? true : userIsActive,
      vendorApprovalStatus: isPublicVendor ? "pending" : "approved", // Public vendors start pending
    };

    // For team invitations, set admin and permissions
    if (invitation) {
      userData.adminId = invitation.adminId;
      userData.permissions = invitation.permissions || {};
    }

    const user = await User.create(userData);

    console.log("=== USER CREATED ===");
    console.log("User ID:", user._id);
    console.log("Role:", user.role);
    console.log("Account Type:", user.accountType);
    console.log("Is Active:", user.isActive);
    console.log("Vendor Approval Status:", user.vendorApprovalStatus);
    console.log("==================");

    // Send verification email for non-invited users
    if (!invitation && verificationToken) {
      try {
        const emailResult = await sendVerificationEmail({
          to: email,
          name: name,
          verificationToken: verificationToken,
        });

        if (!emailResult.success && !emailResult.skipped) {
          console.error(
            "Failed to send verification email:",
            emailResult.error,
          );
          // Don't fail the signup, just log the error
        } else if (emailResult.success) {
          console.log("Verification email sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        // Don't fail the signup, just log the error
      }
    }

    // If team invitation, activate it
    if (invitation) {
      invitation.status = "active";
      invitation.acceptedAt = new Date();
      await invitation.save();
    }

    // If regular user (not team member), create virtual vendor
    if (!invitation && accountType === "user") {
      await Vendor.create({
        name: `${name} (Self)`,
        vendorType: "virtual",
        adminId: user._id,
        description: "Virtual vendor for self-sourced products",
        isActive: true,
      });
    }

    // If public vendor, create public vendor record linked to master admin
    if (isPublicVendor) {
      // Find the master admin
      const masterAdmin = await User.findOne({ role: "master_admin" });

      if (!masterAdmin) {
        // Rollback: delete the user we just created
        await User.findByIdAndDelete(user._id);
        return NextResponse.json(
          {
            error:
              "Master admin not found. Please contact system administrator.",
          },
          { status: 500 },
        );
      }

      // Create public vendor record
      await Vendor.create({
        name: name, // Use vendor's name
        email: email,
        vendorType: "public",
        approvalStatus: "pending",
        status: "pending",
        isActive: false,
        publicVendorUserId: user._id, // Link to the user account
        adminId: masterAdmin._id, // Link to master admin for approval
        description: `Public vendor: ${name}`,
      });

      return NextResponse.json(
        {
          message: "Account created successfully",
          pendingApproval: true, // Flag that this account is pending approval
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            accountType: user.accountType,
            role: user.role,
            membershipPlan: user.membershipPlan,
          },
        },
        { status: 201 },
      );
    }

    // Check if Enterprise plan user (also needs approval notification)
    if (membershipPlan === "enterprise" && !invitation) {
      return NextResponse.json(
        {
          message: "Account created successfully",
          requiresEmailVerification: true, // Flag that email verification is required
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            accountType: user.accountType,
            role: user.role,
            membershipPlan: user.membershipPlan,
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        requiresEmailVerification: !invitation, // Only require verification for non-invited users
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          accountType: user.accountType,
          role: user.role,
          membershipPlan: user.membershipPlan,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.errors) {
      console.error(
        "Validation errors:",
        JSON.stringify(error.errors, null, 2),
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        validationErrors: error.errors
          ? Object.keys(error.errors).map((key) => ({
              field: key,
              message: error.errors[key].message,
            }))
          : null,
      },
      { status: 500 },
    );
  }
}
