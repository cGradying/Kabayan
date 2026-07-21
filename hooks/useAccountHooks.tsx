import { RegisterFormType } from "@/schema/loginSchema";
import { signIn, signUp, signOut } from "@/utils/api";
import { SubmitHandler } from "react-hook-form";
import { useState } from "react";

export default function useAccount ()  {
    const [data, setData] = useState<any>()
    const [error, setError] = useState<string | null>(null)

    const SignInWithPassword: SubmitHandler<RegisterFormType> = async ({email, password} : RegisterFormType) => {
    try {
        const result = await signIn(email, password)
        setData(result)
        setError(null)
    } catch (err: any) {
        setError(err.message || "Sign in failed")
    } 
    }

    const SignUpWithEmailAndPassword: SubmitHandler<RegisterFormType> = async ({email, password} : RegisterFormType) => {
        try {
        const result = await signUp(email, password)
        setData(result)
        setError(null)
        } catch (err: any) {
        setError(err.message || "Sign up failed")
        } 
    }

    const SignOut : SubmitHandler<RegisterFormType> = async () => {
        try {
        await signOut()
        setData(null)
        setError(null)
        } catch (err: any) {
        setError(err.message || "Sign out failed")
        } 
    }

    return {setData, setError, SignOut, SignUpWithEmailAndPassword, SignInWithPassword, data, error}
}
