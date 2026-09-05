import { userRepository } from "@/lib/repositories/user-repository";

export async function isFreshInstall(): Promise<boolean> {
  return (await userRepository.count()) === 0;
}
