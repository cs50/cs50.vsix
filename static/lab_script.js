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
    let prev = event.target.parentElement;
    let next = event.target.parentElement.nextElementSibling;
    next.classList.remove('next');

    let top = event.target.offsetTop;
    let bottom = top + event.target.offsetHeight;

    whileLoop: while (next != null) {
        let children = next.children;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child.hasAttribute('data-next')) {
                child.parentElement.classList.remove('next');
                document.body.style.minHeight = `${bottom + window.innerHeight}px`;
                window.scrollTo({
                    top: bottom + 1,
                    behavior: 'smooth'
                  });
                break whileLoop;
            }
        }
        next.classList.remove('next');
        prev = next;
        next = next.nextElementSibling;
    }
}
