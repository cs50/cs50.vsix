document.addEventListener('DOMContentLoaded', () => {
    let allNextBtns = document.querySelectorAll("[data-next]");
    for (let i = 0; i < allNextBtns.length; i++) {
        allNextBtns[i].addEventListener("click", handleNext);

        let nextElementSibling = allNextBtns[i].parentElement.nextElementSibling;
        while (nextElementSibling != null) {
            nextElementSibling.classList.add('next');
            nextElementSibling = nextElementSibling.nextElementSibling;
        }
    }
});

function handleNext(event) {
    event.target.setAttribute('disabled', 'true');
    let next = event.target.parentElement.nextElementSibling;
    while (next != null) {
        let children = next.children;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child.hasAttribute('data-next')) {
                child.parentElement.classList.remove('next');
                return;
            }
        }
        next.classList.remove('next');
        next = next.nextElementSibling;
    }
}
