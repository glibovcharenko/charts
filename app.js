function entry() {
    let token = localStorage.getItem('token')
    if (token === null || token === undefined) {

        const form = document.getElementById('form')
        const email = document.getElementById('email')
        const password = document.getElementById('password')

        form.addEventListener('submit', async (event) => {
            event.preventDefault()
            const credentials = btoa(`${email.value}:${password.value}`)
            const response = await fetch("https://01.kood.tech/api/auth/signin", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${credentials}`
                }
            })
            let token = await response.json()
            console.log(typeof token)
            console.log(token)
            if (token.error) {
                let err = document.getElementById('err')
                err.style.display = 'block'
            } else {
                localStorage.setItem('token', token)
                location.replace('/charts/data.html')
            }
        })
    } else {
        location.replace('/charts/data.html')
    }

}

entry()