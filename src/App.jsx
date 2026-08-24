import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>Omertà</h1>
      <p>Welcome to your React app!</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}
