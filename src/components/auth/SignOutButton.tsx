export function SignOutButton() {
  return <form action="/auth/sign-out" method="post">
    <button className="button button-quiet" type="submit">Sign out</button>
  </form>;
}
