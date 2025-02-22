"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function Calculator() {
  const [displayValue, setDisplayValue] = useState("0")
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [principal, setPrincipal] = useState("")
  const [rate, setRate] = useState("")
  const [time, setTime] = useState("")
  const [compoundResult, setCompoundResult] = useState("")

  const handleNumberClick = (num: string) => {
    setDisplayValue((prev) => (prev === "0" ? num : prev + num))
  }

  const handleOperationClick = (op: string) => {
    setPreviousValue(Number.parseFloat(displayValue))
    setOperation(op)
    setDisplayValue("0")
  }

  const handleEqualsClick = () => {
    if (previousValue !== null && operation) {
      const current = Number.parseFloat(displayValue)
      let result: number

      switch (operation) {
        case "+":
          result = previousValue + current
          break
        case "-":
          result = previousValue - current
          break
        case "*":
          result = previousValue * current
          break
        case "/":
          result = previousValue / current
          break
        default:
          return
      }

      setDisplayValue(result.toString())
      setPreviousValue(null)
      setOperation(null)
    }
  }

  const handleClear = () => {
    setDisplayValue("0")
    setPreviousValue(null)
    setOperation(null)
  }

  const calculateCompoundInterest = () => {
    const p = Number.parseFloat(principal)
    const r = Number.parseFloat(rate) / 100
    const t = Number.parseFloat(time)

    if (isNaN(p) || isNaN(r) || isNaN(t)) {
      setCompoundResult("Please enter valid numbers")
      return
    }

    const amount = p * Math.pow(1 + r, t)
    setCompoundResult(amount.toFixed(2))
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Multi-Function Calculator</h1>
      <Tabs defaultValue="standard" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard</TabsTrigger>
          <TabsTrigger value="compound">Compound Interest</TabsTrigger>
        </TabsList>
        <TabsContent value="standard">
          <div className="bg-white p-4 rounded-lg shadow">
            <Input className="w-full text-right text-2xl mb-4" value={displayValue} readOnly />
            <div className="grid grid-cols-4 gap-2">
              {[7, 8, 9, "+", 4, 5, 6, "-", 1, 2, 3, "*", 0, ".", "=", "/"].map((item) => (
                <Button
                  key={item}
                  onClick={() => {
                    if (typeof item === "number" || item === ".") {
                      handleNumberClick(item.toString())
                    } else if (item === "=") {
                      handleEqualsClick()
                    } else {
                      handleOperationClick(item)
                    }
                  }}
                  className="text-xl p-2"
                >
                  {item}
                </Button>
              ))}
            </div>
            <Button onClick={handleClear} className="w-full mt-2">
              Clear
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="compound">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="space-y-4">
              <div>
                <Label htmlFor="principal">Principal Amount</Label>
                <Input
                  id="principal"
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="Enter principal amount"
                />
              </div>
              <div>
                <Label htmlFor="rate">Annual Interest Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Enter annual interest rate"
                />
              </div>
              <div>
                <Label htmlFor="time">Time (years)</Label>
                <Input
                  id="time"
                  type="number"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Enter time in years"
                />
              </div>
              <Button onClick={calculateCompoundInterest} className="w-full">
                Calculate
              </Button>
              <div className="mt-4">
                <Label>Result</Label>
                <Input value={compoundResult} readOnly />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

