import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { cn } from "@/lib/utils"
import { verifyLogin } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [error, setError] = useState("")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const account = form.get("account") as string
    const password = form.get("password") as string

    if (verifyLogin(account, password)) {
      sessionStorage.setItem("authenticated", "true")
      navigate("/app", { replace: true })
    } else {
      setError("账户或密码错误")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>登录账户</CardTitle>
          <CardDescription>
            请输入您的账号和密码登录系统
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account">账户</FieldLabel>
                <Input
                  id="account"
                  name="account"
                  type="text"
                  placeholder="请输入账户"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <Input id="password" name="password" type="password" placeholder="请输入密码" required />
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Field>
                <Button type="submit">登录</Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
