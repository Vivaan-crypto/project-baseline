export type SignupState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSignupState: SignupState = { status: "idle", message: "" };
