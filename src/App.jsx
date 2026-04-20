import { useState, useRef, useEffect } from 'react'
import './App.css'

import {
  signIn,
  signOut,
  fetchAuthSession,
  getCurrentUser,
  confirmSignIn
} from 'aws-amplify/auth'

import { generateClient } from 'aws-amplify/api'
import { uploadData } from 'aws-amplify/storage'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [files, setFiles] = useState([])

  const fileInputRef = useRef(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        await getCurrentUser()
        setLoggedIn(true)
      } catch {
        setLoggedIn(false)
      }
    }
    checkUser()
  }, [])

  const handleLogin = async () => {
    try {
      const result = await signIn({ username, password })

      if (result.isSignedIn) {
        await fetchAuthSession()
        setLoggedIn(true)
        alert('Login worked')
      } else {
        if (
          result.nextStep?.signInStep ===
          'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
        ) {
          const newPassword = prompt('Enter a new password')

          const confirmResult = await confirmSignIn({
            challengeResponse: newPassword,
          })

          if (confirmResult.isSignedIn) {
            await fetchAuthSession()
            setLoggedIn(true)
            alert('Password updated & logged in')
          }
        } else {
          alert(`Login not complete: ${result.nextStep?.signInStep}`)
        }
      }
    } catch (error) {
      console.error('LOGIN ERROR:', error)
      setLoggedIn(false)
      alert(error.message || 'Login failed')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setLoggedIn(false)
    } catch (error) {
      console.error(error)
      alert('Logout failed')
    }
  }

  const uploadFile = async (file) => {
    try {
      const user = await getCurrentUser()
      const client = generateClient()

      await uploadData({
        path: `uploads/${file.name}`,
        data: file,
        options: { contentType: file.type },
      }).result

      await client.graphql({
        query: `
          mutation CreateFileRecord($fileName: String!, $s3Key: String!, $userId: String!) {
            createFileRecord(fileName: $fileName, s3Key: $s3Key, userId: $userId) {
              fileId
            }
          }
        `,
        variables: {
          fileName: file.name,
          s3Key: `uploads/${file.name}`,
          userId: user.userId,
        },
        authMode: 'userPool',
      })

      alert('Upload successful')
    } catch (error) {
      console.error('UPLOAD ERROR:', error)
      alert('Upload failed')
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    await uploadFile(file)
  }

  const getFiles = async () => {
    try {
      const user = await getCurrentUser()
      const client = generateClient()

      const result = await client.graphql({
        query: `
          query GetFiles($userId: String!) {
            getFiles(userId: $userId) {
              fileId
              fileName
              s3Key
            }
          }
        `,
        variables: { userId: user.userId },
        authMode: 'userPool',
      })

      setFiles(result.data.getFiles || [])
    } catch (error) {
      console.error(error)
      alert('Failed to get files')
    }
  }

  const addComment = async (fileId) => {
    try {
      const text = commentInputs[fileId]
      if (!text?.trim()) return alert('Enter a comment')

      const user = await getCurrentUser()
      const client = generateClient()

      await client.graphql({
        query: `
          mutation AddComment($fileId: String!, $userId: String!, $text: String!) {
            addComment(fileId: $fileId, userId: $userId, text: $text) {
              commentId
            }
          }
        `,
        variables: {
          fileId,
          userId: user.username,
          text,
        },
        authMode: 'userPool',
      })

      setCommentInputs((prev) => ({ ...prev, [fileId]: '' }))
      await getComments(fileId)
    } catch (error) {
      console.error(error)
      alert('Add comment failed')
    }
  }

  const getComments = async (fileId) => {
    try {
      const client = generateClient()

      const result = await client.graphql({
        query: `
          query GetComments($fileId: String!) {
            getComments(fileId: $fileId) {
              commentId
              userId
              text
            }
          }
        `,
        variables: { fileId },
        authMode: 'userPool',
      })

      setComments((prev) => ({
        ...prev,
        [fileId]: result.data.getComments || [],
      }))
    } catch (error) {
      console.error(error)
      alert('Get comments failed')
    }
  }

  const downloadFile = async (key) => {
    try {
      const client = generateClient()

      const result = await client.graphql({
        query: `
          query GetDownloadUrl($key: String!) {
            getDownloadUrl(key: $key) {
              url
            }
          }
        `,
        variables: { key },
        authMode: 'userPool',
      })

      window.open(result.data.getDownloadUrl.url, '_blank')
    } catch (error) {
      console.error(error)
      alert('Download failed')
    }
  }

  const deleteFile = async (fileId, s3Key) => {
    try {
      const client = generateClient()

      await client.graphql({
        query: `
          mutation DeleteFile($fileId: ID!, $s3Key: String!) {
            deleteFile(fileId: $fileId, s3Key: $s3Key)
          }
        `,
        variables: { fileId, s3Key },
        authMode: 'userPool',
      })

      alert('Deleted')
      await getFiles()
    } catch (error) {
      console.error(error)
      alert('Delete failed')
    }
  }

  return (
    <div className="app">
      <h1>File Share Platform</h1>

      {!loggedIn ? (
        <>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>Login</button>
        </>
      ) : (
        <button onClick={handleLogout}>Logout</button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleFileSelect}
      />
      <button onClick={() => fileInputRef.current.click()}>
        Upload File
      </button>

      <button onClick={getFiles}>View Shared Files</button>

      {files.map((file) => (
        <div key={file.fileId}>
          <p>{file.fileName}</p>

          <button onClick={() => downloadFile(file.s3Key)}>Download</button>
          <button onClick={() => deleteFile(file.fileId, file.s3Key)}>
            Delete
          </button>

          <input
            placeholder="Comment"
            value={commentInputs[file.fileId] || ''}
            onChange={(e) =>
              setCommentInputs((prev) => ({
                ...prev,
                [file.fileId]: e.target.value,
              }))
            }
          />

          <button onClick={() => addComment(file.fileId)}>Add</button>
          <button onClick={() => getComments(file.fileId)}>Load</button>

          {(comments[file.fileId] || []).map((c) => (
            <div key={c.commentId}>
              <strong>{c.userId}</strong>: {c.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default App
