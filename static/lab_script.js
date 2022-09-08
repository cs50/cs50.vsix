document.addEventListener('DOMContentLoaded', () => {
    console.log(window.innerHeight);
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

    let prev = event.target.parentElement;
    let next = event.target.parentElement.nextElementSibling;
    whileLoop: while (next != null) {
        let children = next.children;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child.hasAttribute('data-next')) {
                child.parentElement.classList.remove('next');
                break whileLoop;
            }
        }
        next.classList.remove('next');
        prev = next;
        next = next.nextElementSibling;
    }
    let top = prev.offsetTop;
    let bottom = top + prev.offsetHeight;
    console.log(top, bottom);
    window.scrollBy(0, (bottom + 1));
    console.log("scrolled");
}
