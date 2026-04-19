import { useState } from 'react'
import { useRef } from 'react'
import { useEffect } from 'react'
import './App.css'
import { signIn, signOut } from 'aws-amplify/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/api'
import { getCurrentUser } from 'aws-amplify/auth'
import { confirmSignIn } from 'aws-amplify/auth'
import { uploadData } from 'aws-amplify/storage'


function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
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
      const result = await signIn({
        username,
        password,
      })

      console.log('SIGN IN RESULT:', result)

      

      if (result.isSignedIn) {
  const session = await fetchAuthSession()
  console.log('SESSION AFTER LOGIN:', session)
  setLoggedIn(true)
  alert('Login worked')
} else {
  console.log('NEXT STEP:', result.nextStep)

  // 🔥 HANDLE NEW PASSWORD REQUIRED
  if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
    const newPassword = prompt('Enter a new password')

    const confirmResult = await confirmSignIn({
      challengeResponse: newPassword
    })

    console.log('CONFIRM RESULT:', confirmResult)

    if (confirmResult.isSignedIn) {
      const session = await fetchAuthSession()
      console.log('SESSION AFTER CONFIRM:', session)
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
        options: { contentType: file.type }
      }).result

      console.log('S3 upload finsished')

      await client.graphql({
      query: `
        mutation CreateFileRecord($fileName: String!, $s3Key: String!, $userId: String!) {
          createFileRecord(fileName: $fileName, s3Key: $s3Key, userId: $userId) {
            fileId
            fileName
            s3Key
            userId
            createdAt
            version
          }
        }
      `,
      variables: {
          fileName: file.name,
          s3Key: `uploads/${file.name}`,
          userId: user.userId
      },
      authMode: 'userPool'
    })

    console.log('Metadata saved')

    alert('Upload successful')
  } catch (error) {
    console.error('UPLOAD ERROR:', error)
    alert('Upload failed')
  }
}

console.log ('typeof uploadFile:', typeof uploadFile)

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  try {
    console.log('typeof uploadFile:', typeof uploadFile)
    console.log('selected file:', file)
    await uploadFile(file)
    alert('Upload triggered')
  } catch (error) {
    console.error('UPLOAD ERROR:', error)
    alert('Upload failed')
  }
}
const getFiles = async () => {
  try {
    const session = await fetchAuthSession()
    console.log('SESSION BEFORE GETFILES:', session)

    const user = await getCurrentUser()
    console.log('CURRENT USER', user)

    const client = generateClient()

    const result = await client.graphql({
      query: `
        query GetFiles($userId: String!) {
          getFiles(userId: $userId) {
            fileId
            fileName
            s3Key
            userId
            createdAt
            version
          }
        }
      `,
      variables: {
        userId: user.userId,
      },
      authMode: 'userPool',
    })


    console.log('FILES RESULT:', result)
    console.log('GETFILES ARRAY:', result.data.getFiles)
    alert(`Files found: ${result.data.getFiles.length}`)

    setFiles(result.data.getFiles || [])
  } catch (error) {
    console.error('GET FILES ERROR:', error)
    alert('Failed to get files')
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
      variables: {
        key,
      },
      authMode: 'userPool',
    })

    console.log('DOWNLOAD RESULT:', result)

    const url = result.data.getDownloadUrl.url
    window.open(url, '_blank')
  } catch (error) {
    console.error('DOWNLOAD ERROR:', error)
    alert('Download failed')
  }
}

const deleteFile = async (fileId, s3Key) => {
  try {
    const client = generateClient();

    const result = await client.graphql({
      query: `
        mutation DeleteFile($fileId: ID!, $s3Key: String!) {
          deleteFile(fileId: $fileId, s3Key: $s3Key)
        }
      `,
      variables: {
        fileId,
        s3Key
      },
      authMode: "userPool"
    });

    console.log("DELETE RESULT:", result);

    if (!result.data?.deleteFile) {
      throw new Error("Delete returned null");
    }
    alert("File deleted successfully");

    await getFiles();
  } catch (error) {
    console.error("DELETE ERROR:", error);
    alert("Delete failed");
  }
};



  return (
    <div className="app">
      <h1>File Share Platform</h1>
      <p>{loggedIn ? 'You are logged in.' : 'Frontend is running.'}</p>

      <div className="card" style={{ flexDirection: 'column', minWidth: '300px' }}>
        {!loggedIn ? (
          <>
            <input
              type="text"
              placeholder="Username or email"
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

        <>
  <input
    type="file"
    ref={fileInputRef}
    style={{ display: 'none' }}
    onChange={handleFileSelect}
  />

  <button onClick={() => fileInputRef.current.click()}>
    Upload File
  </button>
</>
        <button onClick={getFiles}>Get Files</button>
        <div style={{ marginTop: '20px', width: '100%' }}>
  {files.length > 0 ? (
    files.map((file) => (
      <div
        key={file.fileId}
        style={{
          background: 'white',
          color: 'black',
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '8px'
        }}
      >
        <p>{file.fileName}</p>

        <button onClick={() => downloadFile(file.s3Key)}>
          Download
        </button>

        <button onClick={() => deleteFile(file.fileId, file.s3Key)}>
          Delete
        </button>

      </div>
    ))
  ) : (
    <p>No files yet</p>
  )}
</div>
      </div>
    </div>
  )
}

export default App
